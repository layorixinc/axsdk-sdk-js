'use client';

import React from 'react';
import type { AXTheme, AXThemeContextValue } from './theme';
import { AX_DEFAULT_DARK_THEME } from './defaultTheme';

const AXThemeContext = React.createContext<AXThemeContextValue>({
  theme: AX_DEFAULT_DARK_THEME,
  resolvedColorMode: 'dark',
});

export interface AXThemeProviderProps {
  theme?: AXTheme;
  children: React.ReactNode;
}

export function AXThemeProvider({ theme, children }: AXThemeProviderProps) {
  const resolvedColorMode: 'dark' | 'light' = theme?.colorMode ?? 'dark';

  const value: AXThemeContextValue = React.useMemo(
    () => ({
      theme: theme ?? AX_DEFAULT_DARK_THEME,
      resolvedColorMode,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, resolvedColorMode]
  );

  return (
    <AXThemeContext.Provider value={value}>
      {children}
    </AXThemeContext.Provider>
  );
}

export function useAXTheme(): AXThemeContextValue {
  return React.useContext(AXThemeContext);
}
