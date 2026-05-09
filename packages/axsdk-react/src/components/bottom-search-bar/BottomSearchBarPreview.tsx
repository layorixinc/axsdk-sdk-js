'use client';

import type { ChatMessage } from '@axsdk/core';
import type { CSSProperties } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AXTheme } from '../../theme';
import { AXChatErrorBar } from '../AXChatErrorBar';
import { AXTtsToggleButton, type AXTtsControl } from '../AXChatMessagePopoverBase';
import { AssistantInfoErrorPreview } from './AssistantInfoErrorPreview';
import { BottomSearchBarChips } from './BottomSearchBarChips';
import { bottomSearchMarkdownComponents, BOTTOM_SEARCH_MARKDOWN_LINE_HEIGHT_PX } from './markdown';

interface BottomSearchBarPreviewProps {
  chipMode: 'onboarding' | 'hidden' | 'shortcuts';
  chipTexts: string[];
  closeButtonLabel: string;
  latestAssistantErrorMessage?: { id: string; text: string };
  latestAssistantInfoError: ChatMessage['info']['error'] | undefined;
  latestAssistantText: string;
  previewGlowEnabled: boolean;
  previewHeaderText: string;
  resetButtonLabel: string;
  statusText: string;
  theme: AXTheme;
  ttsControl?: AXTtsControl;
  onChipSearch: (text: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function BottomSearchBarPreview({
  chipMode,
  chipTexts,
  closeButtonLabel,
  latestAssistantErrorMessage,
  latestAssistantInfoError,
  latestAssistantText,
  previewGlowEnabled,
  previewHeaderText,
  resetButtonLabel,
  statusText,
  theme,
  ttsControl,
  onChipSearch,
  onClear,
  onClose,
}: BottomSearchBarPreviewProps) {
  const previewContentStyle: CSSProperties = {
    padding: '10px 14px 10px 14px',
    fontSize: '0.95em',
    lineHeight: `${BOTTOM_SEARCH_MARKDOWN_LINE_HEIGHT_PX}px`,
    color: 'var(--ax-text-primary)',
    wordBreak: 'break-word',
    ...theme.styles?.popover?.content,
  };

  return (
    <article
      aria-label="AXSDK answer preview"
      data-ax-bottom-search-bar="preview"
      style={{
        width: '100%',
        flex: '1 1 auto',
        maxHeight: 'none',
        minHeight: '8em',
        minWidth: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
        border: '1px solid var(--ax-border-primary, rgba(0,212,255,0.35))',
        borderRadius: 12,
        background: 'var(--ax-bg-popover)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: previewGlowEnabled
          ? '0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset, 0 0 10px 2px var(--ax-color-primary-light, rgba(0,212,255,0.4))'
          : '0 4px 24px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset',
        animation: previewGlowEnabled ? 'ax-bottom-search-bar-preview-pulse 2s ease-in-out infinite' : 'none',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        ...theme.styles?.popover?.card,
      }}
    >
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6em',
          padding: '4px 6px 3px 4px',
          borderBottom: '1px solid var(--ax-border-primary, rgba(0, 212, 255, 0.2))',
          background: 'var(--ax-bg-popover)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--ax-text-muted)',
          fontSize: '0.9em',
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        {ttsControl ? (
          <AXTtsToggleButton
            control={ttsControl}
            theme={theme}
            rowStyle={{ flex: '1 1 auto', minWidth: 0, padding: 0, justifyContent: 'flex-start' }}
          />
        ) : (
          <span title={previewHeaderText} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewHeaderText}</span>
        )}
        <button
          type="button"
          aria-label={closeButtonLabel}
          title={closeButtonLabel}
          onClick={onClose}
          style={{
            flexShrink: 0,
            minWidth: '4.45em',
            minHeight: '2.72em',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.43em',
            border: '1px solid var(--ax-border-primary, rgba(0, 212, 255, 0.4))',
            borderRadius: '999px',
            background: 'var(--ax-bg-input-textarea, rgba(255, 255, 255, 0.12))',
            color: 'var(--ax-text-primary)',
            cursor: 'pointer',
            font: 'inherit',
            fontSize: '0.92em',
            fontWeight: 700,
            lineHeight: 1,
            margin: 0,
            padding: '0.42em 0.72em',
            pointerEvents: 'auto',
            ...theme.styles?.popover?.closeButton,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-ax-bottom-search-bar="close-button-icon" style={{ flexShrink: 0 }}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          <span data-ax-bottom-search-bar="close-button-label" style={{ color: 'inherit', whiteSpace: 'nowrap', userSelect: 'none' }}>
            {closeButtonLabel}
          </span>
        </button>
      </header>
      <div
        className="ax-bottom-search-bar-preview-content"
        data-ax-bottom-search-bar="preview-body"
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          padding: '0.5em',
        }}
      >
        <div style={previewContentStyle}>
          {latestAssistantText ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={bottomSearchMarkdownComponents}>
              {latestAssistantText}
            </ReactMarkdown>
          ) : (
            <div role="status" style={{ color: 'var(--ax-text-muted)', fontSize: '1em', lineHeight: 1.5, textAlign: 'center' }}>
              {statusText}
            </div>
          )}
          <AssistantInfoErrorPreview error={latestAssistantInfoError} />
        </div>
      </div>
      <AXChatErrorBar message={latestAssistantErrorMessage} />
      <BottomSearchBarChips
        chipTexts={chipTexts}
        resetButtonLabel={resetButtonLabel}
        showResetChip={chipMode === 'shortcuts'}
        theme={theme}
        onChipSearch={onChipSearch}
        onReset={onClear}
      />
    </article>
  );
}
