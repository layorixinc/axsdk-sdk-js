import qs from 'qs';
import { AXSDK } from './axsdk';
import { captureScreenshot } from './axtools';
import type { DeferFn } from './deferred';

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
  return await AXSDK.getKnowledgeGroups();
}

export const AX_search_knowledge_schema = `{
  "name": "AX_search_knowledge",
  "description": "Search knowledge base using regex pattern. Optionally fetch and search from an external JSON URL.",
  "parameters": {
    "type": "object",
    "properties": {
      "regex": { "type": "string", "description": "Regular expression pattern to search" },
      "group": { "type": "string", "description": "Knowledge group to search within" },
      "url": { "type": "string", "description": "Optional Knowledge URL. If specified, fetches JSON data from this URL and searches within it instead of the local knowledge base. Expected response format: { total: number, data: [...] }" },
      "page": { "type": "number", "description": "Page number for pagination (default: 1)" },
      "limit": { "type": "number", "description": "Number of results per page (default: 20)" }
    },
    "required": ["regex"]
  }
}`;

export async function AX_search_knowledge(args: unknown) {
  const { group, regex, page = 1, limit = 20, url } = args as { group?: string; regex: string; page?: number; limit?: number; url?: string };
  if (!regex) {
    return { groups: {}, total: 0, page, limit, error: 'Missing regex' };
  }
  try {
    return await AXSDK.searchKnowledge({ group, regex, page, limit, url });
  } catch (e) {
    return { groups: {}, total: 0, page, limit, error: (e as Error).message };
  }
}

function mergeResults(systemResult: any, appResult: any) {
  const hasSystem = Object.keys(systemResult).length > 0;
  if (!appResult) {
    return hasSystem ? JSON.stringify(systemResult) : '';
  }
  else if (typeof appResult === 'object') {
    return JSON.stringify({ ...systemResult, ...appResult });
  }
  else if (typeof appResult === 'function') {
    return mergeResults(systemResult, appResult())
  }

  return hasSystem ? `${JSON.stringify(systemResult)}
${appResult}` : `${appResult}`;
}

async function AX_get_env(args: unknown) {
  if (typeof window !== 'undefined') {
    return { location: window.location.href };
  }
  return {};
}

async function AX_navigate(args: unknown, defer?: DeferFn) {
  if (typeof window === 'undefined') return 'ERROR: window is not available';
  const { link, params } = args as { link: string; params: any };
  const query = qs.stringify(params);
  const url = `${link}${query ? `?${query}` : ''}`;

  const currentUrl = window.location.href;
  const deferId = defer!({ timeout: 30000, hints: { expectedUrl: url, previousUrl: currentUrl } });
  window.location.href = url;
  return deferId;
}

async function AX_navigate_complete(payload: unknown) {
  if (typeof window === 'undefined') return null;
  const { args, hints } = payload as { args: Record<string, unknown>, hints: Record<string, unknown> };
  const expectedUrl = hints?.expectedUrl as string;
  const previousUrl = hints?.previousUrl as string;

  const resolvedExpected = new URL(expectedUrl, window.location.origin).href;

  if (window.location.href === resolvedExpected || window.location.href.startsWith(resolvedExpected)) {
    return `Navigation completed. Current URL: ${window.location.href}`;
  }
  if (window.location.href === previousUrl) {
    return null;
  }
  return `Navigation failed. Expected: ${resolvedExpected}, Current: ${window.location.href}`;
}

const AX_SYSTEM: Record<string, (args: any) => Promise<string>> = {
  AX_clear: async () => {
    AXSDK.eventBus().emit('message.chat', { type: 'axsdk.chat.cancel' });
    AXSDK.resetSession();
    return 'OK';
  },
  AX_complete: async (args) => {
    const { message } = (args ?? {}) as { message?: string };
    await AXSDK.complete(message);
    return 'OK';
  },
  AX_screenshot: async () => {
    return await captureScreenshot();
  },
};

const AX_FUNCTIONS: Record<string, Function> = {
  AX_get_env,
  AX_navigate,
  AX_navigate_complete,
  AX_get_data_categories,
  AX_search_data,
  AX_get_knowledge_groups,
  AX_search_knowledge,
}
const AX_PROXY = new Proxy(AX_FUNCTIONS, {
  get(target, command: string) {
    return target[command] ?? undefined;
  },
});

async function buildSystemResult(command: string): Promise<Record<string, unknown>> {
  const systemResult: Record<string, unknown> = {};
  if (command === 'AX_get_env') {
    systemResult['now'] = new Date().toISOString();
    const envState = AXSDK.getEnvStore().getState();
    const env = AXSDK.config?.env && (typeof AXSDK.config?.env == 'function' ? await AXSDK.config?.env() : AXSDK.config?.env) || {};
    envState.setEnv(env);
    Object.assign(systemResult, env);
  }
  return systemResult;
}

export async function processAXHandler(command: string, args: Record<string, unknown>, defer?: DeferFn): Promise<string | [string, () => Promise<void> | void]> {
  const systemFn = AX_SYSTEM[command];
  if (systemFn) return await systemFn(args);

  const systemResult = await buildSystemResult(command);

  AXSDK.eventBus().emit('message.chat', { type: 'axsdk.axhandler.pre', data: { command, args } });

  let appResult = await AXSDK.axHandler()?.(command, args, defer);
  if (appResult == undefined) {
    appResult = await AX_PROXY[command]?.(args, defer);
  }

  AXSDK.eventBus().emit('message.chat', { type: 'axsdk.axhandler.post', data: { command, args, systemResult, appResult } });

  if (Array.isArray(appResult)) {
    return [mergeResults(systemResult, appResult[0]), appResult[1]]
  } else {
    return mergeResults(systemResult, appResult);
  }
}
