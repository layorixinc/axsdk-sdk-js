import { describe, expect, mock, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AXThemeProvider } from '../src/AXThemeContext';
import { AXSearchBar, DEFAULT_AX_SEARCH_BAR_BUTTON_LABEL } from '../src/components/AXSearchBar';
import { AXSearchOnboarding } from '../src/components/AXSearchOnboarding';

describe('AXSearchBar', () => {
  test('defaults the submit button label to Run', () => {
    expect(DEFAULT_AX_SEARCH_BAR_BUTTON_LABEL).toBe('Run');
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

    expect(markup).toContain('Run');
    expect(markup).toContain('background:var(--ax-bg-input-textarea, rgba(255,255,255,0.08))');
    expect(markup).not.toContain('실행');
    expect(markup).not.toContain('검색');
    expect(markup).not.toContain('data-ax-search-bar="submit-button-image"');
    expect(markup).not.toContain('data-ax-search-bar="clear-button"');
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

    expect(markup).toContain('type="text"');
    expect(markup).not.toContain('type="search"');
    expect(markup).toContain('value="Show my order history"');
    expect(markup).toContain('aria-label="Clear search input"');
    expect(markup).toContain('data-ax-search-bar="clear-button"');
    expect(markup).toContain('background:var(--ax-color-primary, #00b8db)');
    expect(markup).not.toContain('data-ax-search-bar="voice-dictation"');
  });

  test('keeps voice dictation hidden unless explicitly enabled', () => {
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

    expect(markup).not.toContain('data-ax-search-bar="voice-dictation"');
    expect(markup).not.toContain('data-ax-search-bar="voice-status"');
  });

  test('renders opt-in voice dictation controls gracefully when speech recognition is unavailable', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AXThemeProvider,
        undefined,
        React.createElement(AXSearchBar, {
          onSearch: () => undefined,
          placeholder: 'Search',
          enableVoiceDictation: true,
        }),
      ),
    );

    expect(markup).toContain('data-ax-search-bar="voice-dictation"');
    expect(markup).toContain('aria-label="Voice dictation is not available in this browser"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('data-ax-search-bar="voice-status"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
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

  test('keeps the search bar and answer panel close in the searchBar stack', async () => {
    const source = await Bun.file(new URL('../src/components/AXUI.tsx', import.meta.url)).text();
    const searchBarStack = source.match(/top: '1\.25em'[\s\S]*?gap: '0\.5em'/)?.[0] ?? '';

    expect(searchBarStack).toContain("gap: '0.5em'");
    expect(source).not.toContain("gap: '0.75em'");
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
