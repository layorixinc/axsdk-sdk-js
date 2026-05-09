import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AXPoweredBy } from '../src/components/AXPoweredBy';

describe('AXPoweredBy', () => {
  test('renders one external AXSDK attribution link with stable selectors', () => {
    const markup = renderToStaticMarkup(React.createElement(AXPoweredBy));

    expect(markup).toContain('data-ax-powered-by="root"');
    expect(markup).toContain('data-ax-powered-by="link"');
    expect(markup).toContain('href="https://axsdk.ai"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain('Powered by AXSDK');
    expect(markup.match(/<a\b/g)?.length).toBe(1);
    expect(markup).toContain('pointer-events:none');
    expect(markup).toContain('pointer-events:auto');
  });
});