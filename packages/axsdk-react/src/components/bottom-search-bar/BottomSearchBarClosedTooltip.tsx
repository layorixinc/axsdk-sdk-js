'use client';

import type { KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AXTheme } from '../../theme';
import { closedTooltipMarkdownComponents } from './markdown';

interface BottomSearchBarClosedTooltipProps {
  latestAssistantText: string;
  theme: AXTheme;
  onOpen: () => void;
  onTooltipKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export function BottomSearchBarClosedTooltip({
  latestAssistantText,
  theme,
  onOpen,
  onTooltipKeyDown,
}: BottomSearchBarClosedTooltipProps) {
  return (
    <div
      data-ax-bottom-search-bar="closed-tooltip"
      role="button"
      tabIndex={0}
      aria-live="polite"
      aria-label={`Open AXSDK search. Unread assistant message: ${latestAssistantText}`}
      title={latestAssistantText}
      onClick={onOpen}
      onKeyDown={onTooltipKeyDown}
      style={{
        position: 'fixed',
        right: 'calc(max(1em, env(safe-area-inset-right)) + 4.55em)',
        bottom: 'calc(max(1em, env(safe-area-inset-bottom)) + 0.4em)',
        zIndex: 10003,
        maxWidth: 'min(320px, calc(100vw - max(1em, env(safe-area-inset-left)) - max(1em, env(safe-area-inset-right)) - 4.55em))',
        boxSizing: 'border-box',
        ...theme.styles?.popover?.content,
        border: '1px solid var(--ax-border-primary, rgba(0,212,255,0.35))',
        borderRadius: 'var(--ax-tooltip-radius, 12px)',
        background: 'var(--ax-bg-popover, rgba(20,20,30,0.92))',
        color: 'var(--ax-text-primary, rgba(255,255,255,0.94))',
        padding: 'var(--ax-tooltip-padding, 10px 14px)',
        fontSize: 'var(--ax-tooltip-font-size, 0.95em)',
        fontWeight: 600,
        lineHeight: 1.35,
        letterSpacing: '0.01em',
        whiteSpace: 'normal',
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
        textAlign: 'left',
        pointerEvents: 'auto',
        cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: 'var(--ax-tooltip-shadow, 0 12px 30px rgba(0,0,0,0.42)), 0 0 0 1px rgba(var(--ax-color-primary-rgb, 0,212,255),0.12) inset',
        animation: 'ax-bottom-search-bar-tooltip-in 0.2s ease-out both',
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={closedTooltipMarkdownComponents}>
        {latestAssistantText}
      </ReactMarkdown>
    </div>
  );
}
