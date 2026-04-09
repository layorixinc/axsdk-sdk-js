import qs from 'qs';
import { AXSDK, AX_search_data, AX_get_data_categories, AX_get_knowledge_groups, AX_search_knowledge } from '@axsdk/core';

export function isPromise(value: unknown): boolean {
  return !!value && (typeof value === 'function' || typeof value === 'object') && typeof (value as any).then === 'function'
}

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
  return [`OK. Navigating to ${url}`, () => { window.location.href = url; }];
}

const AX_FUNCTIONS = {
  AX_get_env,
  AX_navigate,
  AX_search_data,
  AX_get_data_categories,
  AX_get_knowledge_groups,
  AX_search_knowledge,
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
  let result = await handler(command, args);
  if(result === undefined) {
    result = await AX_PROXY[command as keyof typeof AX_FUNCTIONS]?.(args);
  }
  return result;
}
