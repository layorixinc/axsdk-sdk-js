import qs from 'qs';
import { DeferredCallManager, type DeferFn, AX_search_data, AX_get_data_categories, AX_get_knowledge_groups, AX_search_knowledge } from '@axsdk/core';

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

async function AX_navigate(args: unknown, defer?: DeferFn) {
  const { link, params } = args as { link: string; params: any }
  const query = qs.stringify(params)
  const url = `${link}${query ? `?${query}` : ''}`

  // defer 한 줄로 register + bind + persist 완료
  const deferId = defer!({ timeout: 30000, hints: { expectedUrl: url } })

  // persist 완료 후 navigation → 페이지 리로드되어도 안전
  window.location.href = url
  return deferId
}

async function AX_navigate_complete(
  args: Record<string, unknown>,
  hints: Record<string, unknown>,
): Promise<string | null> {
  const expectedUrl = hints.expectedUrl as string
  if (window.location.href === expectedUrl || window.location.href.startsWith(expectedUrl)) {
    return `Navigation completed. Current URL: ${window.location.href}`
  }
  return null
}

const AX_FUNCTIONS = {
  AX_get_env,
  AX_navigate,
  AX_navigate_complete,
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

// Connect browser AX_PROXY as the completeResolver so DeferredCallManager
// can look up *_complete functions (e.g. AX_navigate_complete) by command name.
DeferredCallManager.setCompleteResolver((command: string) => {
  const fn = AX_PROXY[command as keyof typeof AX_FUNCTIONS] as unknown;
  if (typeof fn === 'function') {
    return fn as (args: Record<string, unknown>, hints: Record<string, unknown>) => Promise<string | null>;
  }
  return undefined;
});

export async function handleAX(handler: AXHandler, command: string, args: unknown) {
  let result = await handler(command, args);
  if(result === undefined) {
    result = await (AX_PROXY[command as keyof typeof AX_FUNCTIONS] as any)?.(args);
  }
  return result;
}
