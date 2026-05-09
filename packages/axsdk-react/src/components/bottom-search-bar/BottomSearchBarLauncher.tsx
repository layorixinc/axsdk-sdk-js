'use client';

import type { KeyboardEvent } from 'react';
import type { AXTheme } from '../../theme';
import { BottomSearchBarClosedTooltip } from './BottomSearchBarClosedTooltip';
import { BottomSearchBarLauncherButton } from './BottomSearchBarLauncherButton';
import { BottomSearchBarLauncherKeyframes } from './keyframes';
import { BottomSearchBarUnreadIndicator } from './BottomSearchBarUnreadIndicator';

interface BottomSearchBarLauncherProps {
  appInfoReady: boolean;
  closedTooltipVisible: boolean;
  hasUnreadAssistantText: boolean;
  indicatorMode?: 'unread' | 'message';
  isBusy: boolean;
  latestAssistantText: string;
  launcherImageSrc?: string;
  theme: AXTheme;
  onOpen: () => void;
  onTooltipKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export function BottomSearchBarLauncher({
  appInfoReady,
  closedTooltipVisible,
  hasUnreadAssistantText,
  indicatorMode,
  isBusy,
  latestAssistantText,
  launcherImageSrc,
  theme,
  onOpen,
  onTooltipKeyDown,
}: BottomSearchBarLauncherProps) {
  return (
    <>
      <BottomSearchBarLauncherKeyframes />
      {closedTooltipVisible && latestAssistantText && (
        <BottomSearchBarClosedTooltip
          latestAssistantText={latestAssistantText}
          theme={theme}
          onOpen={onOpen}
          onTooltipKeyDown={onTooltipKeyDown}
        />
      )}
      {indicatorMode && latestAssistantText && (
        <BottomSearchBarUnreadIndicator mode={indicatorMode} />
      )}
      <BottomSearchBarLauncherButton
        appInfoReady={appInfoReady}
        hasUnreadAssistantText={hasUnreadAssistantText}
        isBusy={isBusy}
        launcherImageSrc={launcherImageSrc}
        theme={theme}
        onOpen={onOpen}
      />
    </>
  );
}
