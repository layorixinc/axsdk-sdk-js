'use client';

import type { MouseEvent, PointerEvent } from 'react';
import type { AXTheme } from '../../theme';

interface BottomSearchBarChipsProps {
  chipTexts: string[];
  resetButtonLabel: string;
  showResetChip: boolean;
  theme: AXTheme;
  onChipSearch: (text: string) => void;
  onReset: () => void;
}

export function BottomSearchBarChips({ chipTexts, resetButtonLabel, showResetChip, theme, onChipSearch, onReset }: BottomSearchBarChipsProps) {
  if (chipTexts.length === 0 && !showResetChip) return null;

  function handleChipPointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function handleChipMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  return (
    <section
      aria-label="AXSDK search suggestions"
      data-ax-bottom-search-bar="chips"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexShrink: 0,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: '0.45em',
        padding: '0.5em 0.75em 0.35em',
        borderTop: '1px solid var(--ax-border-surface, rgba(255,255,255,0.14))',
        pointerEvents: 'auto',
        ...theme.styles?.popover?.content,
      }}
    >
      {chipTexts.map((text) => (
        <button
          key={text}
          type="button"
          aria-label={`Search suggestion: ${text}`}
          title={text}
          onPointerDown={handleChipPointerDown}
          onMouseDown={handleChipMouseDown}
          onClick={() => onChipSearch(text)}
          style={{
            flex: '0 1 auto',
            minWidth: 0,
            maxWidth: 'min(18em, 100%)',
            border: '1px solid var(--ax-border-primary, rgba(0,212,255,0.4))',
            borderRadius: '999px',
            background: 'color-mix(in srgb, var(--ax-color-primary, #00b8db) 14%, var(--ax-bg-input-textarea, transparent))',
            color: 'var(--ax-text-primary)',
            cursor: 'pointer',
            font: 'inherit',
            fontSize: '0.9em',
            lineHeight: 1.35,
            margin: 0,
            overflow: 'hidden',
            padding: '0.48em 0.75em',
            pointerEvents: 'auto',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {text}
        </button>
      ))}
      {showResetChip && (
        <button
          key="__ax-bottom-search-reset-chip"
          type="button"
          aria-label={`Reset bottom search: ${resetButtonLabel}`}
          title={resetButtonLabel}
          data-ax-bottom-search-bar="reset-chip"
          onPointerDown={handleChipPointerDown}
          onMouseDown={handleChipMouseDown}
          onClick={onReset}
          style={{
            flex: '0 1 auto',
            minWidth: '4.9em',
            minHeight: '2.72em',
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
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5em',
            boxShadow: '0 8px 20px rgba(var(--ax-color-primary-rgb, 0,212,255),0.16)',
            transition: 'filter 0.15s ease, transform 0.12s ease, opacity 0.15s ease',
            ...theme.styles?.popover?.closeButton,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-ax-bottom-search-bar="reset-chip-icon" style={{ flexShrink: 0 }}>
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
          </svg>
          <span data-ax-bottom-search-bar="reset-chip-label" style={{ color: 'inherit', whiteSpace: 'nowrap', userSelect: 'none' }}>
            {resetButtonLabel}
          </span>
        </button>
      )}
    </section>
  );
}
