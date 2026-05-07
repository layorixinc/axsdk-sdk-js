import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { ChatMessage, ChatSession } from '@axsdk/core';

import {
  isAXUIAnswerPanelVisible,
  isAXUIFocusWithinElement,
  isAXUISearchOnboardingVisible,
} from '../src/components/AXUIFocus';

class FakeNode {}

class FakeElement {
  constructor(private readonly descendants: Set<object>) {}

  contains(node: Node): boolean {
    return this.descendants.has(node);
  }
}

const originalNode = globalThis.Node;

beforeEach(() => {
  Object.defineProperty(globalThis, 'Node', {
    value: FakeNode,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, 'Node', {
    value: originalNode,
    configurable: true,
  });
});

function fakeElementContaining(target: Node): HTMLElement {
  return new FakeElement(new Set<object>([target])) as unknown as HTMLElement;
}

function session(): ChatSession {
  return {
    id: 'session-1',
    status: 'idle',
    title: 'Session',
    time: { created: Date.now() },
  } as ChatSession;
}

function message(id: string): ChatMessage {
  return {
    info: {
      id,
      role: 'user',
      sessionID: 'session-1',
      time: { created: Date.now() },
      agent: 'agent',
      model: { providerID: 'provider', modelID: 'model' },
    },
    parts: [],
  } as ChatMessage;
}

describe('AXUI searchBar visibility helpers', () => {
  test('shows the answer panel when a session and messages exist regardless of focus', () => {
    expect(isAXUIAnswerPanelVisible(session(), [message('message-1')])).toBe(true);
  });

  test('hides the answer panel without a session or without messages', () => {
    expect(isAXUIAnswerPanelVisible(null, [message('message-1')])).toBe(false);
    expect(isAXUIAnswerPanelVisible(session(), [])).toBe(false);
  });

  test('shows search onboarding only while the search bar is focused', () => {
    expect(isAXUISearchOnboardingVisible(true)).toBe(true);
    expect(isAXUISearchOnboardingVisible(false)).toBe(false);
  });

  test('detects related focus moving into the answer panel container', () => {
    const nextFocusTarget = new FakeNode() as unknown as Node;
    const answerPanelContainer = fakeElementContaining(nextFocusTarget);

    expect(isAXUIFocusWithinElement(nextFocusTarget, answerPanelContainer)).toBe(true);
  });

  test('does not treat outside or missing related focus as contained', () => {
    const answerPanelChild = new FakeNode() as unknown as Node;
    const outsideTarget = new FakeNode() as unknown as Node;
    const answerPanelContainer = fakeElementContaining(answerPanelChild);

    expect(isAXUIFocusWithinElement(outsideTarget, answerPanelContainer)).toBe(false);
    expect(isAXUIFocusWithinElement(null, answerPanelContainer)).toBe(false);
    expect(isAXUIFocusWithinElement(answerPanelChild, null)).toBe(false);
  });
});
