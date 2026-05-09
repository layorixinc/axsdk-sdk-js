'use client';

import { AXSDK } from '@axsdk/core';
import type { AXTheme } from '../../theme';
import { AXSearchBar } from '../AXSearchBar';

interface BottomSearchBarInputProps {
  appInfoReady: boolean;
  buttonLabel: string;
  isBusy: boolean;
  open: boolean;
  placeholder?: string;
  searchBarValue: string;
  theme: AXTheme;
  onSearch: (query: string) => void;
  onSearchBarValueChange: (value: string) => void;
}

export function BottomSearchBarInput({
  appInfoReady,
  buttonLabel,
  isBusy,
  open,
  placeholder,
  searchBarValue,
  theme,
  onSearch,
  onSearchBarValueChange,
}: BottomSearchBarInputProps) {
  return (
    <div
      data-ax-bottom-search-bar="input"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid var(--ax-border-surface, rgba(255,255,255,0.14))',
        borderRadius: '1.15em',
        background: 'var(--ax-bg-popover)',
        boxShadow: '0 18px 64px rgba(0,0,0,0.36), 0 0 0 1px rgba(var(--ax-color-primary-rgb, 0, 212, 255), 0.12)',
        overflow: 'hidden',
        pointerEvents: 'auto',
        ...theme.styles?.input?.card,
      }}
    >
      <AXSearchBar
        placeholder={placeholder ?? AXSDK.t('chatInput')}
        buttonLabel={buttonLabel}
        onSearch={onSearch}
        value={searchBarValue}
        onValueChange={onSearchBarValueChange}
        clearOnSubmit={false}
        disabled={!appInfoReady || isBusy}
        autoFocus={open}
        surface="embedded"
      />
    </div>
  );
}
