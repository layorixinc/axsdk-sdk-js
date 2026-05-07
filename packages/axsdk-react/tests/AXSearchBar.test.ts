import { describe, expect, mock, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AXThemeProvider } from '../src/AXThemeContext';
import { AXSearchBar, DEFAULT_AX_SEARCH_BAR_BUTTON_LABEL } from '../src/components/AXSearchBar';
import { AXSearchOnboarding } from '../src/components/AXSearchOnboarding';

describe('AXSearchBar', () => {
  test('defaults the submit button label to 실행', () => {
    expect(DEFAULT_AX_SEARCH_BAR_BUTTON_LABEL).toBe('실행');
  });

  test('renders the default submit button label', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AXThemeProvider,
        undefined,
        React.createElement(AXSearchBar, {
          onSearch: () => undefined,
          placeholder: 'Search',
        }),
      ),
    );

    expect(markup).toContain('실행');
    expect(markup).not.toContain('검색');
  });

  test('renders a controlled value for persisted search text', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AXThemeProvider,
        undefined,
        React.createElement(AXSearchBar, {
          onSearch: () => undefined,
          placeholder: 'Search',
          value: 'Show my order history',
          clearOnSubmit: false,
        }),
      ),
    );

    expect(markup).toContain('value="Show my order history"');
  });

  test('does not clear a controlled value when clearOnSubmit is false', () => {
    const onSearch = mock((query: string) => query);
    const markup = renderToStaticMarkup(
      React.createElement(
        AXThemeProvider,
        undefined,
        React.createElement(AXSearchBar, {
          onSearch,
          placeholder: 'Search',
          value: 'Buy apples',
          clearOnSubmit: false,
        }),
      ),
    );

    expect(markup).toContain('value="Buy apples"');
    expect(onSearch).not.toHaveBeenCalled();
  });

  test('renders embedded search and suggestions inside one autocomplete panel', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AXThemeProvider,
        undefined,
        React.createElement(
          'section',
          { 'aria-label': 'Unified AXSDK search panel' },
          React.createElement(AXSearchBar, {
            onSearch: () => undefined,
            placeholder: 'Search',
            surface: 'embedded',
            clearOnSubmit: false,
          }),
          React.createElement('div', { 'aria-hidden': true, style: { borderTop: '1px solid var(--ax-border-surface)' } }),
          React.createElement(AXSearchOnboarding, {
            onboardingText: 'Try asking about your app',
            latestUserText: 'recent question',
            layout: 'rows',
            onTextSelect: () => undefined,
          }),
        ),
      ),
    );

    expect(markup).toContain('aria-label="Unified AXSDK search panel"');
    expect(markup).toContain('role="search"');
    expect(markup).toContain('box-shadow:none');
    expect(markup).toContain('data-ax-search-onboarding-layout="rows"');
    expect(markup).toContain('Search suggestion: Try asking about your app');
    expect(markup).toContain('Search suggestion: recent question');
  });
});
