import { describe, expect, test } from 'bun:test';
import type { ChatMessage } from '@axsdk/core';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AXThemeProvider } from '../src/AXThemeContext';
import { AXAnswerPanel } from '../src/components/AXAnswerPanel';
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

describe('AXAnswerPanel', () => {
  test('renders tightened header spacing and roomier latest message padding', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AXThemeProvider,
        undefined,
        React.createElement(AXAnswerPanel, {
          messages: [message('assistant-latest', 'assistant', 'Comfortable answer copy')],
          headerText: 'Latest answer',
          onClose: () => undefined,
          closeLabel: 'Close answer',
        }),
      ),
    );
    const sectionTag = markup.match(/<section\b[^>]*>/)?.[0];
    const headerTag = markup.match(/<header\b[^>]*>/)?.[0];

    expect(sectionTag).toBeDefined();
    expect(sectionTag).toContain('box-shadow:0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(120,80,255,0.12)');
    expect(markup).not.toContain('0 8px 48px rgba(0,0,0,0.35)');
    expect(headerTag).toBeDefined();
    expect(headerTag).toContain('position:sticky');
    expect(headerTag).toContain('gap:0.6em');
    expect(headerTag).toContain('padding:0.62em 0.8em');
    expect(markup).toContain('aria-label="Close answer"');
    expect(markup).toContain('<div style="padding:1.25em"><div');
    expect(markup).not.toContain('gap:0.75em');
    expect(markup).not.toContain('padding:0.75em 0.9em');
  });
});
