'use client';

import type { CSSProperties } from 'react';
import { AXSDK } from '@axsdk/core';

export interface AXPoweredByProps {
  style?: CSSProperties;
  linkStyle?: CSSProperties;
}

const axPoweredByRootStyle: CSSProperties = {
  textAlign: 'center',
  fontSize: '0.65em',
  color: 'var(--ax-text-dim, rgba(255, 255, 255, 0.45))',
  letterSpacing: '0.04em',
  lineHeight: 1.4,
  userSelect: 'none',
  pointerEvents: 'none',
};

const axPoweredByLinkStyle: CSSProperties = {
  color: 'inherit',
  textDecoration: 'underline',
  pointerEvents: 'auto',
};

export function AXPoweredBy({ style, linkStyle }: AXPoweredByProps) {
  const poweredByText = AXSDK.t('poweredBy') || 'Powered by AXSDK';

  return (
    <div data-ax-powered-by="root" style={{ ...axPoweredByRootStyle, ...style }}>
      <a
        data-ax-powered-by="link"
        href="https://axsdk.ai"
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...axPoweredByLinkStyle, ...linkStyle }}
      >
        {poweredByText}
      </a>
    </div>
  );
}