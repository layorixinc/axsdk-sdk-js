import qs from 'qs';
import { AXSDK } from '@axsdk/core';

export type AXHandler = (command: string, args: unknown) => Promise<unknown>

async function AX_get_env(args: unknown) {
  const env = {
    location: window.location.href
  }
  return env;
}

async function AX_navigate(args: unknown) {
  const { link, params } = args as { link: string; params: any }
  const query = qs.stringify(params)
  const url = `${link}${query ? `?${query}` : ''}`
  return {
    message: `OK. Navigating to ${url}`,
    $: async () => {
      window.location.href = url;
    }
  };
}

async function AX_search_data(args: unknown) {
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

const AX_FUNCTIONS = {
  AX_get_env,
  AX_navigate,
  AX_search_data,
}
const AX_PROXY = new Proxy(AX_FUNCTIONS, {
  get(target, command: string) {
    return target[command as keyof typeof target] ?? (() => ({
      status: "ERROR",
      message: `Unknown command: ${command}`,
    }));
  },
});

const pending_callbacks: Record<string, () => Promise<void>> = {}

export async function handleAX(handler: AXHandler, command: string, args: unknown) {
  let result
  try {
    result = await handler(command, args);
  } catch(err) {
    result = await AX_PROXY[command as keyof typeof AX_FUNCTIONS](args);
  }
  if(!!result && typeof result === 'object' && (result as any).$) {
    const callbackId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    pending_callbacks[callbackId] = (result as any).$;
    return { ...result, ...{"$": callbackId} };
  }
  return result;
}

export async function executeCallback(callbackId: string): Promise<void> {
  const callback = pending_callbacks[callbackId];
  if (!callback) {
    return;
  }
  delete pending_callbacks[callbackId];
  await callback();
}
