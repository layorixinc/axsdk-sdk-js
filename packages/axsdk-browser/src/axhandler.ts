import { processAXHandler } from '@axsdk/core';

export type AXHandler = (command: string, args: unknown) => Promise<unknown>

export async function handleAX(handler: AXHandler, command: string, args: unknown) {
  let result = await handler(command, args);
  if(result === undefined) {
    result = await processAXHandler(command, args as Record<string, unknown>);
  }
  return result;
}
