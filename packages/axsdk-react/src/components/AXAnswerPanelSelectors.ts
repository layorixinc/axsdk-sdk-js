import type { ChatMessage, TextPart } from '@axsdk/core';

export function extractMessageText(message: ChatMessage | undefined): string {
  return message?.parts
    ?.filter((part): part is TextPart => part.type === 'text')
    .map((part) => part.text?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .trim() ?? '';
}

export function findLatestAssistantMessage(messages: ChatMessage[]): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.info.role === 'assistant') return message;
  }

  return undefined;
}

export function findLatestUserMessage(messages: ChatMessage[]): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.info.role === 'user' && extractMessageText(message)) return message;
  }

  return undefined;
}
