import { describe, expect, test } from 'bun:test';
import type { ChatMessage } from '@axsdk/core';

import {
  extractMessageText,
  findLatestAssistantMessage,
  findLatestUserMessage,
} from '../src/components/AXAnswerPanelSelectors';

function message(id: string, role: 'user' | 'assistant', text?: string): ChatMessage {
  return {
    info: {
      id,
      role,
      sessionID: 'session-1',
      time: { created: Date.now() },
      agent: 'agent',
      model: { providerID: 'provider', modelID: 'model' },
    },
    parts: text === undefined ? [] : [{ type: 'text', text }],
  } as ChatMessage;
}

describe('findLatestAssistantMessage', () => {
  test('returns the newest assistant message even when a user message is last', () => {
    const assistant = message('assistant-latest', 'assistant');

    expect(findLatestAssistantMessage([
      message('assistant-old', 'assistant'),
      assistant,
      message('user-latest', 'user'),
    ])).toBe(assistant);
  });

  test('returns undefined when there is no assistant message', () => {
    expect(findLatestAssistantMessage([message('user-only', 'user')])).toBeUndefined();
  });

  test('returns undefined for an empty message list', () => {
    expect(findLatestAssistantMessage([])).toBeUndefined();
  });
});

describe('findLatestUserMessage', () => {
  test('returns the newest user message with text even when a later assistant message exists', () => {
    const latestUser = message('user-latest', 'user', 'recent question');

    expect(findLatestUserMessage([
      message('user-old', 'user', 'old question'),
      latestUser,
      message('assistant-latest', 'assistant', 'answer'),
    ])).toBe(latestUser);
  });

  test('skips user messages without meaningful text', () => {
    const latestUserWithText = message('user-with-text', 'user', 'usable question');

    expect(findLatestUserMessage([
      latestUserWithText,
      message('user-empty', 'user'),
      message('user-whitespace', 'user', '   '),
    ])).toBe(latestUserWithText);
  });

  test('returns undefined when there is no user message with text', () => {
    expect(findLatestUserMessage([
      message('assistant-only', 'assistant', 'answer'),
      message('user-empty', 'user'),
    ])).toBeUndefined();
  });
});

describe('extractMessageText', () => {
  test('joins and trims text parts', () => {
    const target = {
      ...message('mixed-text', 'user'),
      parts: [
        { type: 'text', text: ' first ' },
        { type: 'text', text: 'second' },
      ],
    } as ChatMessage;

    expect(extractMessageText(target)).toBe('first second');
  });
});
