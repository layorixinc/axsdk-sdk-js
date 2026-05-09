'use client';

import type { ChatMessage } from '@axsdk/core';
import { AXSDK } from '@axsdk/core';
import { AXChatMessage } from './AXChatMessage';
import { findLatestAssistantMessage } from './AXAnswerPanelSelectors';
import { useAXTheme } from '../AXThemeContext';

export interface AXAnswerPanelProps {
  messages?: ChatMessage[];
  message?: ChatMessage;
  isBusy?: boolean;
  emptyText?: string;
  busyText?: string;
  headerText?: string;
  onClose?: () => void;
  closeLabel?: string;
}

export function AXAnswerPanel({
  messages = [],
  message,
  isBusy = false,
  emptyText,
  busyText,
  headerText,
  onClose,
  closeLabel = 'Close answer panel',
}: AXAnswerPanelProps) {
  const { theme } = useAXTheme();
  const latestAssistantMessage = message ?? findLatestAssistantMessage(messages);
  const statusText = isBusy ? (busyText ?? AXSDK.t('chatBusyGuide')) : (emptyText ?? AXSDK.t('chatEmpty'));
  const showHeader = !!headerText || !!onClose;

  return (
    <section
      aria-label="AXSDK answer"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '18em',
        maxHeight: '70vh',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden',
        border: '1px solid var(--ax-border-surface, rgba(255, 255, 255, 0.12))',
        borderRadius: '1.25em',
        background: 'var(--ax-bg-base)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(120,80,255,0.12)',
        pointerEvents: 'auto',
      }}
    >
      {showHeader && (
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6em',
            padding: '0.62em 0.8em',
            borderBottom: '1px solid var(--ax-border-surface, rgba(255, 255, 255, 0.12))',
            background: 'var(--ax-bg-popover, var(--ax-bg-base))',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div
            title={headerText}
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--ax-text-primary)',
              fontSize: '0.92em',
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {headerText}
          </div>
          {onClose && (
            <button
              type="button"
              aria-label={closeLabel}
              onClick={onClose}
              style={{
                flexShrink: 0,
                width: '2em',
                height: '2em',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--ax-border-surface, rgba(255, 255, 255, 0.14))',
                borderRadius: '999px',
                background: 'var(--ax-bg-input-textarea, rgba(255,255,255,0.08))',
                color: 'var(--ax-text-primary)',
                cursor: 'pointer',
                font: 'inherit',
                fontSize: '1.2em',
                lineHeight: 1,
                margin: 0,
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </header>
      )}
      {latestAssistantMessage ? (
        <div style={{ padding: '1.25em' }}>
          <AXChatMessage message={latestAssistantMessage} />
        </div>
      ) : (
        <div
          role="status"
          style={{
            minHeight: showHeader ? 'calc(100% - 3.5em)' : '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25em',
            textAlign: 'center',
            color: 'var(--ax-text-muted)',
            fontSize: '0.95em',
            lineHeight: 1.5,
            ...theme.styles?.popover?.content,
          }}
        >
          {statusText}
        </div>
      )}
    </section>
  );
}
