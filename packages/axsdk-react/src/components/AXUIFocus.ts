import type { ChatMessage, ChatSession } from '@axsdk/core';

export function isAXUIFocusWithinElement(
  relatedTarget: EventTarget | null,
  container: HTMLElement | null,
): boolean {
  return relatedTarget instanceof Node && container?.contains(relatedTarget) === true;
}

export function isAXUIAnswerPanelVisible(session: ChatSession | null | undefined, messages: ChatMessage[]): boolean {
  return !!session && messages.length > 0;
}

export function isAXUISearchOnboardingVisible(searchBarFocused: boolean): boolean {
  return searchBarFocused;
}
