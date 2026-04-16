'use client';

import React from 'react';

const AXShadowRootContext = React.createContext<ShadowRoot | null>(null);

export interface AXShadowRootProviderProps {
  shadowRoot: ShadowRoot;
  children: React.ReactNode;
}

export function AXShadowRootProvider({ shadowRoot, children }: AXShadowRootProviderProps) {
  return (
    <AXShadowRootContext.Provider value={shadowRoot}>
      {children}
    </AXShadowRootContext.Provider>
  );
}

export function useAXShadowRoot(): ShadowRoot | null {
  return React.useContext(AXShadowRootContext);
}
