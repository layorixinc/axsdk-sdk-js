export type AXHandler = (command: string, args: unknown) => Promise<unknown>

export async function handleAX(handler: AXHandler, command: string, args: unknown) {
  return await handler(command, args);
}
