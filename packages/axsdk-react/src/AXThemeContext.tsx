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

/**
 * Provides the resolved theme to all child components via React context.
 *
 * Place this around the portal content inside `AXUI` so every child can
 * access the theme via `useAXTheme()` without prop drilling.
 */
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

/**
 * Consume the active AX theme inside any component that is a descendant of
 * `<AXThemeProvider>`.
 *
 * Returns `{ theme, resolvedColorMode }`.
 */
export function useAXTheme(): AXThemeContextValue {
  return React.useContext(AXThemeContext);
}
