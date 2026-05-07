'use client';

import React, { useState } from 'react';
import { AXSDK } from '@axsdk/core';
import { useAXTheme } from '../AXThemeContext';

export interface AXSearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
  buttonLabel?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  clearOnSubmit?: boolean;
  onFocusChange?: (focused: boolean, event: React.FocusEvent<HTMLFormElement>) => void;
  surface?: 'standalone' | 'embedded';
}

export const DEFAULT_AX_SEARCH_BAR_BUTTON_LABEL = '실행';

export function AXSearchBar({
  onSearch,
  disabled = false,
  placeholder,
  buttonLabel = DEFAULT_AX_SEARCH_BAR_BUTTON_LABEL,
  defaultValue = '',
  value,
  onValueChange,
  clearOnSubmit = true,
  onFocusChange,
  surface = 'standalone',
}: AXSearchBarProps) {
  const { theme } = useAXTheme();
  const [localQuery, setLocalQuery] = useState(defaultValue);
  const query = value ?? localQuery;
  const trimmedQuery = query.trim();
  const submitDisabled = disabled || !trimmedQuery;
  const isEmbedded = surface === 'embedded';

  function setQuery(nextQuery: string) {
    if (value === undefined) setLocalQuery(nextQuery);
    onValueChange?.(nextQuery);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitDisabled) return;
    onSearch(trimmedQuery);
    if (clearOnSubmit) setQuery('');
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      onFocus={(event) => onFocusChange?.(true, event)}
      onBlur={(event) => {
        const nextFocusTarget = event.relatedTarget;
        if (nextFocusTarget instanceof Node && event.currentTarget.contains(nextFocusTarget)) return;
        onFocusChange?.(false, event);
      }}
      style={{
        width: '100%',
        maxWidth: isEmbedded ? undefined : '680px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5em',
        padding: isEmbedded ? '0.45em 0.5em' : '0.5em',
        border: isEmbedded ? 'none' : '1px solid var(--ax-border-surface, rgba(255,255,255,0.14))',
        borderRadius: isEmbedded ? '1em' : '999px',
        background: isEmbedded ? 'transparent' : 'var(--ax-bg-popover)',
        boxShadow: isEmbedded ? 'none' : '0 8px 32px rgba(0,0,0,0.28)',
        pointerEvents: 'auto',
        ...(isEmbedded ? undefined : theme.styles?.input?.card),
      }}
    >
      <input
        type="search"
        value={query}
        disabled={disabled}
        placeholder={placeholder ?? AXSDK.t('chatInput')}
        aria-label={placeholder ?? AXSDK.t('chatInput')}
        onChange={(event) => setQuery(event.currentTarget.value)}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--ax-text-primary)',
          caretColor: 'var(--ax-text-caret, var(--ax-color-primary-light))',
          fontSize: '1em',
          lineHeight: 1.4,
          padding: '0.55em 0.75em',
          ...theme.styles?.input?.textarea,
        }}
      />
      <button
        type="submit"
        disabled={submitDisabled}
        style={{
          flexShrink: 0,
          border: '1px solid var(--ax-border-primary, rgba(168,85,247,0.45))',
          borderRadius: '999px',
          padding: '0.55em 1em',
          background: submitDisabled ? 'rgba(255,255,255,0.08)' : 'var(--ax-color-primary)',
          color: submitDisabled ? 'var(--ax-text-dim)' : 'var(--ax-text-primary)',
          cursor: submitDisabled ? 'not-allowed' : 'pointer',
          fontSize: '0.92em',
          fontWeight: 700,
          transition: 'filter 0.15s ease, opacity 0.15s ease',
          opacity: submitDisabled ? 0.7 : 1,
          ...theme.styles?.input?.sendButton,
        }}
      >
        {buttonLabel}
      </button>
    </form>
  );
}
