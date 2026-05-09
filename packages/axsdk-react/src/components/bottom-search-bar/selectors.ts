import type { ChatMessage } from '@axsdk/core';

export function findLatestUserMessage(messages: ChatMessage[]): ChatMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.info?.role === 'user') return messages[index];
  }
  return undefined;
}
