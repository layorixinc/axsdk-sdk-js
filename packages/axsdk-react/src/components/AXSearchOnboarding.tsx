'use client';

import React from 'react';
import { useAXTheme } from '../AXThemeContext';
import {
  buildAXSearchOnboardingContent,
  selectAXSearchOnboardingText,
  type AXSearchOnboardingContent,
  type AXSearchOnboardingTextSelectHandler,
} from './AXSearchOnboardingContent';

export interface AXSearchOnboardingProps extends AXSearchOnboardingContent {
  onTextSelect?: AXSearchOnboardingTextSelectHandler;
  layout?: 'card' | 'rows';
}

export function AXSearchOnboarding({ onboardingText, latestUserText, onTextSelect, layout = 'card' }: AXSearchOnboardingProps) {
  const { theme } = useAXTheme();
  const content = buildAXSearchOnboardingContent(onboardingText, latestUserText);
  const isRowsLayout = layout === 'rows';

  if (!content.onboardingText && !content.latestUserText) return null;

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function handleMouseDown(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function handleRowMouseEnter(event: React.MouseEvent<HTMLButtonElement>) {
    event.currentTarget.style.background = 'var(--ax-bg-input-textarea)';
    event.currentTarget.style.transform = 'translateX(0.12em)';
  }

  function handleRowMouseLeave(event: React.MouseEvent<HTMLButtonElement>) {
    event.currentTarget.style.background = 'transparent';
    event.currentTarget.style.transform = 'translateX(0)';
  }

  function renderSearchIcon() {
    return (
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: '1.6em',
          height: '1.6em',
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'color-mix(in srgb, var(--ax-color-primary, #7c3aed) 16%, transparent)',
          color: 'var(--ax-color-primary-light, var(--ax-text-muted))',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 4 4" />
        </svg>
      </span>
    );
  }

  function renderArrowIcon() {
    return (
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          color: 'var(--ax-text-dim)',
          width: '1.2em',
          height: '1.2em',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </span>
    );
  }

  function renderSelectableText(text: string, muted: boolean) {
    if (isRowsLayout) {
      return (
        <button
          key={`${muted ? 'onboarding' : 'latest'}:${text}`}
          type="button"
          onPointerDown={handlePointerDown}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleRowMouseEnter}
          onMouseLeave={handleRowMouseLeave}
          onClick={() => selectAXSearchOnboardingText(text, onTextSelect)}
          title={text}
          aria-label={`Search suggestion: ${text}`}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            border: '1px solid transparent',
            borderRadius: '0.85em',
            background: 'transparent',
            color: muted ? 'var(--ax-text-muted)' : 'var(--ax-text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.7em',
            font: 'inherit',
            fontSize: '0.95em',
            lineHeight: 1.4,
            margin: 0,
            padding: '0.6em 0.7em',
            overflow: 'hidden',
            textAlign: 'left',
            transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease',
          }}
        >
          {renderSearchIcon()}
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {text}
          </span>
          {renderArrowIcon()}
        </button>
      );
    }

    return (
      <button
        key={`${muted ? 'onboarding' : 'latest'}:${text}`}
        type="button"
        onPointerDown={handlePointerDown}
        onMouseDown={handleMouseDown}
        onClick={() => selectAXSearchOnboardingText(text, onTextSelect)}
        title={text}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: muted
            ? '1px solid transparent'
            : '1px solid var(--ax-border-surface, rgba(255,255,255,0.14))',
          borderRadius: muted ? '0.75em' : '999px',
          background: muted ? 'transparent' : 'var(--ax-bg-input-textarea)',
          color: muted ? 'var(--ax-text-muted)' : 'var(--ax-text-primary)',
          cursor: 'pointer',
          font: 'inherit',
          fontSize: muted ? '0.92em' : '0.9em',
          lineHeight: muted ? 1.5 : 1.4,
          margin: 0,
          padding: muted ? '0.25em 0.35em' : '0.45em 0.8em',
          overflow: 'hidden',
          textAlign: muted ? 'left' : 'center',
          textOverflow: 'ellipsis',
          transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
          whiteSpace: muted ? 'pre-wrap' : 'nowrap',
        }}
      >
        {text}
      </button>
    );
  }

  function getRowsLayoutItems() {
    const seen = new Set<string>();
    const add = (text: string | undefined, muted: boolean) => {
      const normalized = text?.trim();
      if (!normalized || seen.has(normalized)) return [];
      seen.add(normalized);
      return [{ text: normalized, muted }];
    };

    const onboardingItems = content.onboardingText
      ?.split(',')
      .flatMap((text) => add(text, true)) ?? [];
    const latestItems = content.latestUserText === content.onboardingText
      ? []
      : add(content.latestUserText, false);

    return [...onboardingItems, ...latestItems];
  }

  return (
    <section
      aria-label="AXSDK search onboarding"
      data-ax-search-onboarding-layout={layout}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: isRowsLayout ? '0.35em' : '0.9em 1em',
        border: isRowsLayout ? 'none' : '1px solid var(--ax-border-surface, rgba(255,255,255,0.14))',
        borderRadius: isRowsLayout ? 0 : '1em',
        background: isRowsLayout ? 'transparent' : 'var(--ax-bg-popover)',
        boxShadow: isRowsLayout ? 'none' : '0 8px 32px rgba(0,0,0,0.22)',
        color: 'var(--ax-text-primary)',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: isRowsLayout ? '0.15em' : '0.55em',
        ...(isRowsLayout ? undefined : theme.styles?.popover?.content),
      }}
    >
      {isRowsLayout
        ? getRowsLayoutItems().map(({ text, muted }) => renderSelectableText(text, muted))
        : <>
          {content.onboardingText && renderSelectableText(content.onboardingText, true)}
          {content.latestUserText && renderSelectableText(content.latestUserText, false)}
        </>}
    </section>
  );
}
