import { describe, expect, mock, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AXThemeProvider } from '../src/AXThemeContext';
import { AXSearchOnboarding } from '../src/components/AXSearchOnboarding';
import {
  buildAXSearchOnboardingContent,
  getAXSearchOnboardingSelectableTexts,
  selectAXSearchOnboardingText,
} from '../src/components/AXSearchOnboardingContent';

describe('buildAXSearchOnboardingContent', () => {
  test('includes onboarding text and the latest user message text', () => {
    expect(buildAXSearchOnboardingContent('Try asking about your app', 'recent question')).toEqual({
      onboardingText: 'Try asking about your app',
      latestUserText: 'recent question',
    });
  });

  test('omits empty latest user message text', () => {
    expect(buildAXSearchOnboardingContent('Try asking about your app', '   ')).toEqual({
      onboardingText: 'Try asking about your app',
      latestUserText: undefined,
    });
  });

  test('omits empty onboarding text', () => {
    expect(buildAXSearchOnboardingContent('   ', 'recent question')).toEqual({
      onboardingText: undefined,
      latestUserText: 'recent question',
    });
  });

  test('returns selectable displayed texts in render order', () => {
    expect(getAXSearchOnboardingSelectableTexts({
      onboardingText: 'Try asking about your app',
      latestUserText: 'recent question',
    })).toEqual(['Try asking about your app', 'recent question']);
  });

  test('does not expose whitespace-only selectable texts', () => {
    expect(getAXSearchOnboardingSelectableTexts({
      onboardingText: '   ',
      latestUserText: undefined,
    })).toEqual([]);
  });

  test('selects normalized displayed text through the callback', () => {
    const onTextSelect = mock((text: string) => text);

    selectAXSearchOnboardingText('  recent question  ', onTextSelect);

    expect(onTextSelect).toHaveBeenCalledWith('recent question');
  });

  test('does not call the callback for whitespace-only text', () => {
    const onTextSelect = mock((text: string) => text);

    selectAXSearchOnboardingText('   ', onTextSelect);

    expect(onTextSelect).not.toHaveBeenCalled();
  });
});

describe('AXSearchOnboarding rendering', () => {
  test('renders selectable onboarding and latest user text as button controls', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AXThemeProvider,
        undefined,
        React.createElement(AXSearchOnboarding, {
          onboardingText: 'Try asking about your app',
          latestUserText: 'recent question',
          onTextSelect: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('<button type="button"');
    expect(markup).toContain('Try asking about your app');
    expect(markup).toContain('recent question');
  });

  test('renders autocomplete rows with suggestion labels when embedded', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AXThemeProvider,
        undefined,
        React.createElement(AXSearchOnboarding, {
          onboardingText: 'Try asking about your app',
          latestUserText: 'recent question',
          layout: 'rows',
          onTextSelect: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('data-ax-search-onboarding-layout="rows"');
    expect(markup).toContain('Search suggestion: Try asking about your app');
    expect(markup).toContain('Search suggestion: recent question');
    expect(markup).toContain('box-shadow:none');
  });

  test('splits comma-separated onboarding text into autocomplete rows', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AXThemeProvider,
        undefined,
        React.createElement(AXSearchOnboarding, {
          onboardingText: '뭐 팔아?, 가장 저렴한 사과 구매해줘, 주문 내역 보여줘',
          latestUserText: '주문 내역 보여줘',
          layout: 'rows',
          onTextSelect: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('Search suggestion: 뭐 팔아?');
    expect(markup).toContain('Search suggestion: 가장 저렴한 사과 구매해줘');
    expect(markup).toContain('Search suggestion: 주문 내역 보여줘');
    expect(markup.match(/Search suggestion: 주문 내역 보여줘/g)?.length).toBe(1);
  });
});
