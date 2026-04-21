import { type DeferFn } from '@axsdk/core';
export type AXHandler = (command: string, args: unknown, defer: DeferFn) => Promise<unknown>

export async function handleAX(handler: AXHandler, command: string, args: unknown, defer: DeferFn) {
  return await handler(command, args, defer);
}
