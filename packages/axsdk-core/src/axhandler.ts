import { AXSDK } from './axsdk';
import { captureScreenshot } from './axtools';

export async function AX_get_data_categories() {
  const data = AXSDK.getDataState().data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') {
    return { categories: [] };
  }
  return { categories: Object.keys(data) };
}

export async function AX_search_data(args: unknown) {
  const { category, regex, flags, offset = 0, limit = 20 } = args as { category: string, regex: string, flags?: string, offset: number, limit: number };
  let data: any[] = [];
  if (!category) {
    data = AXSDK.getAllData() ?? [];
  } else {
    data = AXSDK.getData(category) ?? [];
  }

  let pattern: RegExp | null = null;
  if (regex) {
    try {
      pattern = new RegExp(regex, flags ?? 'i');
    } catch (e) {
      return {
        data: [],
        total: 0,
        offset,
        limit,
        hasMore: false,
        error: `Invalid regex: ${(e as Error).message}`,
      };
    }
  }

  const filtered = pattern
    ? data.filter((item) => {
        if (item === null || item === undefined) return false;
        if (typeof item === 'object') {
          return Object.values(item).some(
            (val) => typeof val === 'string' && pattern!.test(val)
          ) || pattern!.test(JSON.stringify(item));
        }
        return pattern!.test(String(item));
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

export async function AX_get_knowledge_groups() {
  return AXSDK.getKnowledgeGroups();
}

export async function AX_search_knowledge(args: unknown) {
  const { group, regex, page = 1, limit = 20 } = args as { group?: string; regex: string; page?: number; limit?: number };
  if (!regex) {
    return { groups: {}, total: 0, page, limit, error: 'Missing regex' };
  }
  try {
    return await AXSDK.searchKnowledge({ group, regex, page, limit });
  } catch (e) {
    return { groups: {}, total: 0, page, limit, error: (e as Error).message };
  }
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

const AX_FUNCTIONS = {
  AX_get_knowledge_groups,
  AX_search_knowledge,
}
const AX_PROXY = new Proxy(AX_FUNCTIONS, {
  get(target, command: string) {
    return target[command as keyof typeof target] ?? undefined;
  },
});

export async function processAXHandler(command: string, args: Record<string, unknown>): Promise<string | [string, () => Promise<void> | void]> {
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
  if (command === 'AX_complete') {
    const { message } = (args ?? {}) as { message?: string };
    await AXSDK.complete(message);
    return 'OK'
  }
  if (command === 'AX_screenshot') {
    const dataUrl = await captureScreenshot();
    return dataUrl;
  }

  AXSDK.eventBus().emit('message.chat', { type: 'axsdk.axhandler.pre', data: { command, args } });

  let appResult = await AXSDK.axHandler()?.(command, args);
  if(appResult == undefined) {
    appResult = await AX_PROXY[command as keyof typeof AX_FUNCTIONS]?.(args);
  }

  AXSDK.eventBus().emit('message.chat', { type: 'axsdk.axhandler.post', data: { command, args, systemResult, appResult } });

  if (Array.isArray(appResult)) {
    return [mergeResults(systemResult, appResult[0]), appResult[1]]
  } else {
    result = mergeResults(systemResult, appResult);
  }
  return result;
}
