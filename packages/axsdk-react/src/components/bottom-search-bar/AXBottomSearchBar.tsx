'use client';

import type { ChatMessage } from '@axsdk/core';
import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import { AXSDK } from '@axsdk/core';
import { useAXTheme } from '../../AXThemeContext';
import type { AXTtsControl } from '../AXChatMessagePopoverBase';
import { extractMessageText, findLatestAssistantMessage } from '../AXAnswerPanelSelectors';
import { BottomSearchBarLauncher } from './BottomSearchBarLauncher';
import { BottomSearchBarSurface } from './BottomSearchBarSurface';
import { buildAXBottomSearchBarChipTexts } from './content';
import { findLatestUserMessage } from './selectors';
import { selectAXSearchOnboardingText } from '../AXSearchOnboardingContent';

const BOTTOM_SEARCH_READ_ASSISTANT_IDS_STORAGE_KEY = 'axsdk:bottom-search-read-assistant-message-ids';

function loadReadAssistantMessageIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const rawValue = window.localStorage.getItem(BOTTOM_SEARCH_READ_ASSISTANT_IDS_STORAGE_KEY);
    const parsedValue: unknown = rawValue ? JSON.parse(rawValue) : [];
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.filter((value): value is string => typeof value === 'string' && value.length > 0);
  } catch {
    return [];
  }
}

function saveReadAssistantMessageIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BOTTOM_SEARCH_READ_ASSISTANT_IDS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore storage failures so the widget still works in restricted browsing contexts.
  }
}

export interface AXBottomSearchBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: ChatMessage[];
  isDesktop: boolean;
  isBusy: boolean;
  appInfoReady: boolean;
  searchBarValue: string;
  onSearchBarValueChange: (value: string) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
  onboardingText?: string;
  shortcutText?: string;
  showShortcutChips?: boolean;
  latestUserText?: string;
  placeholder?: string;
  buttonLabel?: string;
  previewTitle?: string;
  resetLabel?: string;
  closeLabel?: string;
  emptyText?: string;
  busyText?: string;
  ttsControl?: AXTtsControl;
}

export function AXBottomSearchBar({
  open,
  onOpenChange,
  messages,
  isDesktop,
  isBusy,
  appInfoReady,
  searchBarValue,
  onSearchBarValueChange,
  onSearch,
  onClear,
  onboardingText,
  shortcutText,
  showShortcutChips = false,
  latestUserText,
  placeholder,
  buttonLabel = 'Run',
  previewTitle,
  resetLabel = 'Clear',
  closeLabel = 'Close',
  emptyText,
  busyText,
  ttsControl,
}: AXBottomSearchBarProps) {
  const { theme } = useAXTheme();
  const latestAssistantMessage = findLatestAssistantMessage(messages);
  const latestAssistantText = extractMessageText(latestAssistantMessage);
  const latestAssistantInfoError = latestAssistantMessage?.info.error;
  const latestAssistantErrorMessage = latestAssistantMessage
    ? { id: latestAssistantMessage.info.id, text: latestAssistantText }
    : undefined;
  const latestAssistantId = latestAssistantMessage?.info.id ?? null;
  const latestUserHeaderText = latestUserText?.trim() || extractMessageText(findLatestUserMessage(messages)).trim();
  const previewHeaderText = latestUserHeaderText || previewTitle || AXSDK.t('chatPreviewTitle');
  const hasUserMessage = Boolean(latestUserHeaderText);
  const chipMode: 'onboarding' | 'hidden' | 'shortcuts' = !hasUserMessage
    ? 'onboarding'
    : isBusy
    ? 'hidden'
    : showShortcutChips
    ? 'shortcuts'
    : 'hidden';
  const chipTexts = chipMode === 'hidden'
    ? []
    : buildAXBottomSearchBarChipTexts(onboardingText, latestUserHeaderText || undefined, shortcutText, chipMode === 'shortcuts', latestAssistantText);
  const statusText = isBusy ? (busyText ?? AXSDK.t('chatBusyGuide')) : (emptyText ?? AXSDK.t('chatEmpty'));
  const previewGlowEnabled = Boolean(latestAssistantText && !isBusy);
  const resetButtonLabel = resetLabel.trim() || 'Clear';
  const closeButtonLabel = closeLabel.trim() || 'Close';
  const [readAssistantIds, setReadAssistantIds] = useState<Set<string>>(() => {
    const initialIds = new Set(loadReadAssistantMessageIds());
    if (open && latestAssistantId) {
      initialIds.add(latestAssistantId);
      saveReadAssistantMessageIds(initialIds);
    }
    return initialIds;
  });
  const hasUnreadAssistantText = Boolean(latestAssistantId && latestAssistantText && !readAssistantIds.has(latestAssistantId));
  const closedTooltipVisible = !open && hasUnreadAssistantText;
  const indicatorMode = hasUnreadAssistantText ? 'unread' : latestAssistantText ? 'message' : undefined;
  const launcherImageSrc = isBusy
    ? (theme.buttonAnimationImageUrl ?? theme.buttonImageUrl)
    : theme.buttonImageUrl;

  function markLatestAssistantRead() {
    if (!latestAssistantId) return;

    setReadAssistantIds((currentIds) => {
      if (currentIds.has(latestAssistantId)) return currentIds;

      const nextIds = new Set(currentIds);
      nextIds.add(latestAssistantId);
      saveReadAssistantMessageIds(nextIds);
      return nextIds;
    });
  }

  function requestOpen() {
    markLatestAssistantRead();
    onOpenChange(true);
  }

  function closeAndMarkRead() {
    markLatestAssistantRead();
    onOpenChange(false);
  }

  function handleClosedTooltipKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      requestOpen();
    }
  }

  function submitChipText(text: string) {
    selectAXSearchOnboardingText(text, onSearch);
  }

  return (
    <div
      data-ax-bottom-search-bar="root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10002,
        pointerEvents: 'none',
      }}
    >
      {!open && (
        <BottomSearchBarLauncher
          appInfoReady={appInfoReady}
          closedTooltipVisible={closedTooltipVisible}
          hasUnreadAssistantText={hasUnreadAssistantText}
          indicatorMode={indicatorMode}
          isBusy={isBusy}
          latestAssistantText={latestAssistantText}
          launcherImageSrc={launcherImageSrc}
          theme={theme}
          onOpen={requestOpen}
          onTooltipKeyDown={handleClosedTooltipKeyDown}
        />
      )}

      {open && (
        <BottomSearchBarSurface
          appInfoReady={appInfoReady}
          buttonLabel={buttonLabel}
          chipTexts={chipTexts}
          chipMode={chipMode}
          closeButtonLabel={closeButtonLabel}
          isBusy={isBusy}
          isDesktop={isDesktop}
          latestAssistantErrorMessage={latestAssistantErrorMessage}
          latestAssistantInfoError={latestAssistantInfoError}
          latestAssistantText={latestAssistantText}
          open={open}
          placeholder={placeholder}
          previewGlowEnabled={previewGlowEnabled}
          previewHeaderText={previewHeaderText}
          resetButtonLabel={resetButtonLabel}
          searchBarValue={searchBarValue}
          statusText={statusText}
          theme={theme}
          ttsControl={ttsControl}
          onChipSearch={submitChipText}
          onClear={onClear}
          onClose={closeAndMarkRead}
          onSearch={onSearch}
          onSearchBarValueChange={onSearchBarValueChange}
        />
      )}
    </div>
  );
}
