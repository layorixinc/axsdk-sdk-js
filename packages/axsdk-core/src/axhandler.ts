import { AXSDK } from './axsdk';
import { captureScreenshot } from './axtools';

export async function AX_search_data(args: unknown) {
  const { category, query, offset = 0, limit = 20 } = args as { category: string, query: string, offset: number, limit: number };
  let data: any[] = [];
  if (!category) {
    data = AXSDK.getAllData() ?? [];
  } else {
    data = AXSDK.getData(category) ?? [];
  }

  const tokens = query
    ? query.split(/[\s,;]+/).map((t) => t.toLowerCase()).filter((t) => t.length > 0)
    : [];
  const filtered = tokens.length > 0
    ? data.filter((item) => {
        if (item === null || item === undefined) return false;
        return tokens.every((token) => {
          if (typeof item === 'object') {
            return Object.values(item).some(
              (val) => typeof val === 'string' && val.toLowerCase().includes(token)
            ) || JSON.stringify(item).toLowerCase().includes(token);
          }
          return String(item).toLowerCase().includes(token);
        });
      })
    : data;

  const total = filtered.length;
  const paginatedData = filtered.slice(offset, offset + limit);

  return {
    data: paginatedData,
    total,
    offset,
    limit,
    hasMore: (offset + limit) < total,
  };
}

function mergeResults(systemResult: any, appResult: any) {
  if (!appResult) {
    return JSON.stringify(systemResult);
  }
  else if (typeof appResult === 'object') {
    return JSON.stringify({ ...systemResult, ...appResult });
  }
  else if (typeof appResult === 'function') {
    return mergeResults(systemResult, appResult())
  }
  
  return `${JSON.stringify(systemResult)}
${appResult}`;
}

export async function processAXHandler(command: string, args: Record<string, unknown>): Promise<string | [string, Promise<void>]> {
  let result: string = '';

  const systemResult: Record<string, unknown> = {};
  if (command === 'AX_get_env') {
    systemResult['now'] = new Date().toISOString();

    const envState = AXSDK.getEnvStore().getState();
    const env = AXSDK.config?.env && (typeof AXSDK.config?.env == 'function' ? await AXSDK.config?.env() : AXSDK.config?.env) || {}
    envState.setEnv(env);

    Object.assign(systemResult, env);
  }
  if (command === 'AX_clear') {
    AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.cancel' });
    AXSDK.resetSession();
    return 'OK'
  }
  if (command === 'AX_screenshot') {
    const dataUrl = await captureScreenshot();
    return dataUrl;
  }

  const appResult = await AXSDK.axHandler()?.(command, args);
  if (Array.isArray(appResult)) {
    return [mergeResults(systemResult, appResult[0]), appResult[1]]
  } else {
    result = mergeResults(systemResult, appResult);
  }
  return result;
}
