'use client';

import type { ChatMessage } from '@axsdk/core';
import type { AXTheme } from '../../theme';
import type { AXTtsControl } from '../AXChatMessagePopoverBase';
import { AXPoweredBy } from '../shared/AXPoweredBy';
import { BottomSearchBarInput } from './BottomSearchBarInput';
import { BottomSearchBarPreview } from './BottomSearchBarPreview';
import { BottomSearchBarSurfaceKeyframes } from './keyframes';

interface BottomSearchBarSurfaceProps {
  appInfoReady: boolean;
  buttonLabel: string;
  chipMode: 'onboarding' | 'hidden' | 'shortcuts';
  chipTexts: string[];
  closeButtonLabel: string;
  isBusy: boolean;
  isDesktop: boolean;
  latestAssistantErrorMessage?: { id: string; text: string };
  latestAssistantInfoError: ChatMessage['info']['error'] | undefined;
  latestAssistantText: string;
  open: boolean;
  placeholder?: string;
  previewGlowEnabled: boolean;
  previewHeaderText: string;
  resetButtonLabel: string;
  searchBarValue: string;
  statusText: string;
  theme: AXTheme;
  ttsControl?: AXTtsControl;
  onChipSearch: (text: string) => void;
  onClear: () => void;
  onClose: () => void;
  onSearch: (query: string) => void;
  onSearchBarValueChange: (value: string) => void;
}

export function BottomSearchBarSurface({
  appInfoReady,
  buttonLabel,
  chipMode,
  chipTexts,
  closeButtonLabel,
  isBusy,
  isDesktop,
  latestAssistantErrorMessage,
  latestAssistantInfoError,
  latestAssistantText,
  open,
  placeholder,
  previewGlowEnabled,
  previewHeaderText,
  resetButtonLabel,
  searchBarValue,
  statusText,
  theme,
  ttsControl,
  onChipSearch,
  onClear,
  onClose,
  onSearch,
  onSearchBarValueChange,
}: BottomSearchBarSurfaceProps) {
  return (
    <>
      <BottomSearchBarSurfaceKeyframes />
      <section
        aria-label="AXSDK bottom search"
        data-ax-bottom-search-bar="surface"
        style={{
          position: 'fixed',
          left: isDesktop ? '50%' : 0,
          right: isDesktop ? undefined : 0,
          bottom: 'max(1em, env(safe-area-inset-bottom))',
          width: isDesktop ? 'min(720px, calc(100vw - 2em))' : 'auto',
          maxWidth: isDesktop ? 'calc(100vw - 2em)' : undefined,
          paddingLeft: isDesktop ? undefined : 'max(0.75em, env(safe-area-inset-left))',
          paddingRight: isDesktop ? undefined : 'max(0.75em, env(safe-area-inset-right))',
          boxSizing: 'border-box',
          transform: isDesktop ? 'translate(-50%, 0)' : 'translateY(0)',
          opacity: 1,
          pointerEvents: 'auto',
          transition: 'opacity 0.24s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          animation: isDesktop
            ? 'ax-bottom-search-bar-surface-in-desktop 0.32s cubic-bezier(0.22, 1, 0.36, 1) both'
            : 'ax-bottom-search-bar-surface-in-mobile 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55em',
          color: 'var(--ax-text-primary)',
        }}
      >
        <BottomSearchBarPreview
          chipMode={chipMode}
          chipTexts={chipTexts}
          closeButtonLabel={closeButtonLabel}
          latestAssistantErrorMessage={latestAssistantErrorMessage}
          latestAssistantInfoError={latestAssistantInfoError}
          latestAssistantText={latestAssistantText}
          previewGlowEnabled={previewGlowEnabled}
          previewHeaderText={previewHeaderText}
          resetButtonLabel={resetButtonLabel}
          statusText={statusText}
          theme={theme}
          ttsControl={ttsControl}
          onChipSearch={onChipSearch}
          onClear={onClear}
          onClose={onClose}
        />
        <BottomSearchBarInput
          appInfoReady={appInfoReady}
          buttonLabel={buttonLabel}
          isBusy={isBusy}
          open={open}
          placeholder={placeholder}
          searchBarValue={searchBarValue}
          theme={theme}
          onSearch={onSearch}
          onSearchBarValueChange={onSearchBarValueChange}
        />
        <AXPoweredBy
          style={{
            color: 'var(--ax-text-muted, rgba(255,255,255,0.66))',
          }}
        />
      </section>
    </>
  );
}
