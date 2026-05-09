import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AXSDK, type ChatMessage } from '@axsdk/core';
import type { AXTheme } from '../src/theme';

import { AXThemeProvider } from '../src/AXThemeContext';
import { AX_DEFAULT_DARK_THEME, AX_DEFAULT_LIGHT_THEME } from '../src/defaultTheme';
import { AXBottomSearchBar } from '../src/components/AXBottomSearchBar';
import { buildAXBottomSearchBarChipTexts } from '../src/components/AXBottomSearchBarContent';
import type { AXTtsControl } from '../src/components/AXChatMessagePopoverBase';

function message(id: string, role: 'user' | 'assistant', text: string): ChatMessage {
  return {
    info: {
      id,
      role,
      sessionID: 'session-1',
      time: { created: Date.now() },
      agent: 'agent',
      model: { providerID: 'provider', modelID: 'model' },
    },
    parts: [{ type: 'text', text }],
  } as ChatMessage;
}

function messageInfoError(name: string, text: string): NonNullable<ChatMessage['info']['error']> {
  return {
    name,
    data: {
      message: text,
      statusCode: 500,
      isRetryable: false,
      responseHeaders: {},
      responseBody: '',
      metadata: { url: 'https://example.com/assistant-info-error' },
    },
  };
}

function assistantMessageWithInfoError(id: string, text: string, name: string, errorMessage: string): ChatMessage {
  const baseMessage = message(id, 'assistant', text);
  return {
    ...baseMessage,
    info: {
      ...baseMessage.info,
      error: messageInfoError(name, errorMessage),
    },
  };
}

function ttsControl(overrides: Partial<AXTtsControl> = {}): AXTtsControl {
  return {
    enabled: true,
    pending: false,
    onToggle: () => undefined,
    ...overrides,
  };
}

function renderBottomSearchBar(
  open: boolean,
  isDesktop = true,
  messages = [message('assistant-1', 'assistant', 'Here is the latest answer.')],
  isBusy = false,
  appInfoReady = true,
  latestUserText = 'Ask docs',
  showShortcutChips = false,
  resetLabel = 'Clear',
  theme?: AXTheme,
  control?: AXTtsControl,
  closeLabel = 'Close',
  onboardingText = 'Ask pricing, Ask docs, Ask pricing',
  shortcutText = 'Again, Continue',
) {
  return renderToStaticMarkup(
    React.createElement(
      AXThemeProvider,
      { theme },
      React.createElement(AXBottomSearchBar, {
        open,
        onOpenChange: () => undefined,
        messages,
        isDesktop,
        isBusy,
        appInfoReady,
        searchBarValue: 'current search',
        onSearchBarValueChange: () => undefined,
        onSearch: () => undefined,
        onClear: () => undefined,
        onboardingText,
        shortcutText,
        showShortcutChips,
        latestUserText,
        placeholder: 'Search AXSDK',
        buttonLabel: 'Run',
        previewTitle: 'Translated AI preview',
        resetLabel,
        closeLabel,
        emptyText: 'Start a search',
        busyText: 'Searching',
        ttsControl: control,
      }),
    ),
  );
}

function getBottomSearchPreviewStyle(markup: string): string {
  const previewTag = markup.match(/<article\b(?=[^>]*data-ax-bottom-search-bar="preview")[^>]*>/)?.[0];
  expect(previewTag).toBeDefined();

  const style = previewTag?.match(/\sstyle="([^"]*)"/)?.[1];
  expect(style).toBeDefined();

  return style ?? '';
}

function getBottomSearchSurfaceStyle(markup: string): string {
  const surfaceTag = markup.match(/<section\b(?=[^>]*data-ax-bottom-search-bar="surface")[^>]*>/)?.[0];
  expect(surfaceTag).toBeDefined();

  const style = surfaceTag?.match(/\sstyle="([^"]*)"/)?.[1];
  expect(style).toBeDefined();

  return style ?? '';
}

function getBottomSearchChipsStyle(markup: string): string {
  const chipsTag = markup.match(/<section\b(?=[^>]*data-ax-bottom-search-bar="chips")[^>]*>/)?.[0];
  expect(chipsTag).toBeDefined();

  const style = chipsTag?.match(/\sstyle="([^"]*)"/)?.[1];
  expect(style).toBeDefined();

  return style ?? '';
}

function getBottomSearchLauncherTag(markup: string): string {
  const launcherTag = markup.match(/<button\b(?=[^>]*data-ax-bottom-search-bar="launcher")[^>]*>/)?.[0];
  expect(launcherTag).toBeDefined();

  return launcherTag ?? '';
}

function getBottomSearchClosedTooltipTag(markup: string): string {
  const tooltipTag = markup.match(/<div\b(?=[^>]*data-ax-bottom-search-bar="closed-tooltip")[^>]*>/)?.[0];
  expect(tooltipTag).toBeDefined();

  return tooltipTag ?? '';
}

function getButtonTagByLabel(markup: string, label: string): string {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const buttonTag = markup.match(new RegExp(`<button\\b(?=[^>]*aria-label="${escapedLabel}")[^>]*>`))?.[0];
  expect(buttonTag).toBeDefined();

  return buttonTag ?? '';
}

beforeEach(() => {
  AXSDK.getErrorStore().getState().clearErrors();
});

afterEach(() => {
  AXSDK.getErrorStore().getState().clearErrors();
});

describe('buildAXBottomSearchBarChipTexts', () => {
  test('splits onboarding text without adding the latest user text', () => {
    expect(buildAXBottomSearchBarChipTexts('Ask pricing, Ask docs, Ask pricing', 'Ask docs', 'Again, Continue', false)).toEqual([
      'Ask pricing',
      'Ask docs',
    ]);
  });

  test('uses shortcut chips instead of onboarding chips during an active session', () => {
    expect(buildAXBottomSearchBarChipTexts('Ask pricing, Ask docs', 'Ask docs', 'Again, Continue, Again', true)).toEqual([
      'Again',
      'Continue',
    ]);
  });

  test('adds assistant markdown strong text before default shortcuts while preserving defaults', () => {
    expect(buildAXBottomSearchBarChipTexts('Ask pricing, Ask docs', 'Ask docs', 'Again, Continue, Again', true, 'Try **Premium apples** and __Order history__. **Again**')).toEqual([
      'Premium apples',
      'Order history',
      'Again',
      'Continue',
    ]);
  });
});

describe('AXBottomSearchBar', () => {
  test('closed state keeps pass-through root and bottom-right launcher clickable', () => {
    const markup = renderBottomSearchBar(false);

    expect(markup).toContain('data-ax-bottom-search-bar="root"');
    expect(markup).toContain('pointer-events:none');
    expect(markup).toContain('data-ax-bottom-search-bar="launcher"');
    expect(markup).toContain('data-ax-bottom-search-bar-animation="idle"');
    expect(markup).toContain('aria-label="Open AXSDK search. Unread assistant message"');
    expect(markup).toContain('pointer-events:auto');
    expect(markup).not.toContain('data-ax-bottom-search-bar="surface"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="preview"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="chips"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="input"');
    expect(markup).not.toContain('data-ax-powered-by="root"');
    expect(markup).not.toContain('data-ax-powered-by="link"');
    expect(markup).toContain('data-ax-bottom-search-bar="unread-indicator"');
    expect(markup).toContain('data-ax-bottom-search-bar-indicator="unread"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('background:var(--ax-text-error, #f87171)');
    expect(markup).toContain('<svg');
    expect(markup).toContain('d="M12 5v8"');
    expect(markup).not.toContain('>New<');
    expect(markup).not.toContain('aria-label="Clear"');
    expect(markup).not.toContain('Clear bottom search session');
    expect(markup).not.toContain('aria-label="Close bottom search"');
    expect(markup).not.toContain('Search suggestion: Ask pricing');
    expect(markup).not.toContain('role="search"');
  });

  test('closed tooltip renders latest assistant markdown as the clickable unread action', () => {
    const markup = renderBottomSearchBar(false, true, [
      message('assistant-old', 'assistant', 'Older answer'),
      message('user-1', 'user', 'User text should stay out'),
      message('assistant-latest', 'assistant', '**Bold latest**\n\n- markdown item'),
      message('user-2', 'user', 'Newest user text should not replace assistant text'),
    ]);
    const tooltipTag = getBottomSearchClosedTooltipTag(markup);

    expect(markup).toContain('data-ax-bottom-search-bar="closed-tooltip"');
    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-label="Open AXSDK search. Unread assistant message: **Bold latest');
    expect(markup).toContain('title="**Bold latest');
    expect(markup).toContain('Bold latest');
    expect(markup).toContain('<strong');
    expect(markup).toContain('<li');
    expect(markup).toContain('markdown item');
    expect(markup).toContain('pointer-events:auto');
    expect(tooltipTag).not.toContain('display:-webkit-box');
    expect(tooltipTag).not.toContain('-webkit-line-clamp');
    expect(tooltipTag).not.toContain('-webkit-box-orient');
    expect(tooltipTag).not.toContain('max-height:calc(2.7em + 20px)');
    expect(tooltipTag).not.toContain('overflow:hidden');
    expect(tooltipTag).not.toContain('text-overflow:ellipsis');
    expect(markup).not.toContain('<p style="display:inline;margin:0;line-height:inherit"');
    expect(markup).not.toContain('<li style="display:inline;margin:0;line-height:inherit"');
    expect(markup).toContain('right:calc(max(1em, env(safe-area-inset-right)) + 4.55em)');
    expect(markup).toContain('bottom:calc(max(1em, env(safe-area-inset-bottom)) + 0.4em)');
    expect(markup).toContain('max-width:min(320px, calc(100vw - max(1em, env(safe-area-inset-left)) - max(1em, env(safe-area-inset-right)) - 4.55em))');
    expect(markup).toContain('data-ax-bottom-search-bar="unread-indicator"');
    expect(markup).not.toContain('Older answer');
    expect(markup).not.toContain('User text should stay out');
    expect(markup).not.toContain('Newest user text should not replace assistant text');
    expect(markup).not.toContain('data-ax-bottom-search-bar="surface"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="preview"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="chips"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="input"');
    expect(markup).not.toContain('data-ax-powered-by="root"');
    expect(markup).not.toContain('data-ax-powered-by="link"');
  });

  test('closed tooltip does not render without assistant text', () => {
    const markup = renderBottomSearchBar(false, true, [
      message('user-1', 'user', 'Only user text'),
    ]);

    expect(markup).toContain('data-ax-bottom-search-bar="launcher"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="closed-tooltip"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="unread-indicator"');
    expect(markup).not.toContain('Only user text');
  });

  test('component source persists closed tooltip read state by assistant message id', async () => {
    const source = await Bun.file(new URL('../src/components/bottom-search-bar/AXBottomSearchBar.tsx', import.meta.url)).text();

    expect(source).toContain("'axsdk:bottom-search-read-assistant-message-ids'");
    expect(source).toContain('window.localStorage.getItem(BOTTOM_SEARCH_READ_ASSISTANT_IDS_STORAGE_KEY)');
    expect(source).toContain('window.localStorage.setItem(BOTTOM_SEARCH_READ_ASSISTANT_IDS_STORAGE_KEY');
    expect(source).toContain('const latestAssistantId = latestAssistantMessage?.info.id ?? null;');
    expect(source).toContain('!readAssistantIds.has(latestAssistantId)');
    expect(source).toContain('nextIds.add(latestAssistantId);');
    expect(source).toContain('markLatestAssistantRead();\n    onOpenChange(true);');
    expect(source).not.toContain('latestAssistantKey');
  });

  test('component source has no closed tooltip auto-hide timer path', async () => {
    const sourceFiles = [
      '../src/components/bottom-search-bar/AXBottomSearchBar.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarLauncher.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarClosedTooltip.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarUnreadIndicator.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarLauncherButton.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarSurface.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarPreview.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarChips.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarInput.tsx',
    ];
    const source = (await Promise.all(
      sourceFiles.map((filePath) => Bun.file(new URL(filePath, import.meta.url)).text()),
    )).join('\n');

    expect(source).not.toContain('CLOSED_TOOLTIP_AUTO_HIDE_MS');
    expect(source).not.toContain('tooltipHiddenAssistantKey');
    expect(source).not.toContain('setTimeout');
    expect(source).not.toContain('clearTimeout');
    expect(source).not.toContain('useEffect');
    expect(source).not.toContain('BOTTOM_SEARCH_CHIP_SCROLL_');
    expect(source).not.toContain('ChipScrollControlState');
    expect(source).not.toContain('chipsScrollRef');
    expect(source).not.toContain('chipScrollControls');
    expect(source).not.toContain('chips-scroll-region');
    expect(source).not.toContain('chips-scroll-left');
    expect(source).not.toContain('chips-scroll-right');
  });

  test('default search palette and component fallbacks stay teal aligned', async () => {
    const bottomSearchBarFiles = [
      '../src/components/bottom-search-bar/AXBottomSearchBar.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarLauncher.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarClosedTooltip.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarUnreadIndicator.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarLauncherButton.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarSurface.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarPreview.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarChips.tsx',
      '../src/components/bottom-search-bar/BottomSearchBarInput.tsx',
      '../src/components/bottom-search-bar/markdown.tsx',
      '../src/components/bottom-search-bar/keyframes.tsx',
    ];
    const bottomSearchBarSource = (await Promise.all(
      bottomSearchBarFiles.map((filePath) => Bun.file(new URL(filePath, import.meta.url)).text()),
    )).join('\n');
    const searchBarSource = await Bun.file(new URL('../src/components/AXSearchBar.tsx', import.meta.url)).text();
    const searchSurfaceSource = `${bottomSearchBarSource}\n${searchBarSource}`;

    const defaultThemeSource = JSON.stringify([AX_DEFAULT_DARK_THEME, AX_DEFAULT_LIGHT_THEME]);

    expect(AX_DEFAULT_DARK_THEME.colors?.primary?.primary).toBe('#00b8db');
    expect(AX_DEFAULT_DARK_THEME.colors?.primary?.primaryDark).toBe('#005f73');
    expect(AX_DEFAULT_DARK_THEME.colors?.primary?.primaryLight).toBe('#00d4ff');
    expect(AX_DEFAULT_DARK_THEME.colors?.primary?.primaryMuted).toBe('#7ddff0');
    expect(AX_DEFAULT_DARK_THEME.colors?.bg?.dark?.userMessage).toContain('rgba(0,184,219,1)');
    expect(AX_DEFAULT_DARK_THEME.colors?.bg?.dark?.questionDialog).toContain('rgba(0,95,115,0.97)');
    expect(AX_DEFAULT_DARK_THEME.colors?.text?.caret).toBe('#00d4ff');
    expect(AX_DEFAULT_DARK_THEME.colors?.text?.gradient).toContain('#00d4ff');
    expect(AX_DEFAULT_LIGHT_THEME.colors?.primary?.primary).toBe('#00b8db');
    expect(AX_DEFAULT_LIGHT_THEME.colors?.primary?.primaryDark).toBe('#064e5f');
    expect(AX_DEFAULT_LIGHT_THEME.colors?.text?.gradient).toContain('#00b8db');
    expect(searchSurfaceSource).toContain('#00b8db');
    expect(searchSurfaceSource).toContain('0,212,255');
    expect(defaultThemeSource).not.toContain('#0f766e');
    expect(defaultThemeSource).not.toContain('#2dd4bf');
    expect(defaultThemeSource).not.toContain('#5eead4');
    expect(defaultThemeSource).not.toContain('#14b8a6');
    expect(searchSurfaceSource).not.toContain('#0f766e');
    expect(searchSurfaceSource).not.toContain('#2dd4bf');
    expect(searchSurfaceSource).not.toContain('#5eead4');
    expect(searchSurfaceSource).not.toContain('#14b8a6');
    expect(searchSurfaceSource).not.toContain('45,212,191');
    expect(searchSurfaceSource).not.toContain('45, 212, 191');
    expect(searchSurfaceSource).not.toContain('#7c3aed');
    expect(searchSurfaceSource).not.toContain('#a855f7');
    expect(searchSurfaceSource).not.toContain('#ec4899');
    expect(searchSurfaceSource).not.toContain('168,85,247');
    expect(searchSurfaceSource).not.toContain('168, 85, 247');
    expect(searchSurfaceSource).not.toContain('192,132,252');
    expect(searchSurfaceSource).not.toContain('139,92,246');
  });

  test('closed launcher exposes idle animation layers', () => {
    const markup = renderBottomSearchBar(false);

    expect(markup).toContain('data-ax-bottom-search-bar-animation="idle"');
    expect(markup).toContain('data-ax-bottom-search-bar="launcher-idle-ring"');
    expect(markup).toContain('data-ax-bottom-search-bar="launcher-idle-glow"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="launcher-image"');
    expect(markup).toContain('ax-bottom-search-bar-launcher-idle-pulse');
    expect(markup).toContain('ax-bottom-search-bar-launcher-ring-rotate');
    expect(markup).toContain('ax-bottom-search-bar-launcher-glow');
    expect(markup).not.toContain('data-ax-bottom-search-bar="launcher-busy-spin"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="launcher-busy-pulse"');
  });

  test('busy closed launcher exposes busy animation layers', () => {
    const markup = renderBottomSearchBar(false, true, [message('assistant-1', 'assistant', 'Busy answer')], true);

    expect(markup).toContain('data-ax-bottom-search-bar-animation="busy"');
    expect(markup).toContain('data-ax-bottom-search-bar="launcher-busy-spin"');
    expect(markup).toContain('data-ax-bottom-search-bar="launcher-busy-pulse"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="launcher-image"');
    expect(markup).toContain('ax-bottom-search-bar-launcher-busy-spin');
    expect(markup).toContain('ax-bottom-search-bar-launcher-busy-pulse');
    expect(markup).not.toContain('data-ax-bottom-search-bar="launcher-idle-ring"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="launcher-idle-glow"');
  });

  test('appInfoReady false keeps the closed launcher disabled', () => {
    const markup = renderBottomSearchBar(false, true, [message('assistant-1', 'assistant', 'Disabled answer')], false, false);

    expect(markup).toContain('data-ax-bottom-search-bar="launcher"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('cursor:not-allowed');
    expect(markup).toContain('opacity:0.66');
    expect(markup).toContain('animation:none');
  });

  test('open header hides reset control by default', () => {
    const markup = renderBottomSearchBar(true, true, [message('assistant-1', 'assistant', 'Here is the latest answer.')], false, true, 'Ask docs', false, '지우기');

    expect(markup).not.toContain('aria-label="지우기"');
    expect(markup).not.toContain('title="지우기"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="reset-button-icon"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="reset-button-label"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="reset-chip"');
    expect(markup).not.toContain('>Reset<');
    expect(markup).not.toContain('Clear bottom search session');
  });

  test('shortcut chips append a distinct reset chip with suggestion chip sizing', () => {
    const markup = renderBottomSearchBar(true, true, [message('assistant-1', 'assistant', 'Here is the latest answer.')], false, true, 'Ask docs', true, '지우기', undefined, undefined, 'Close', 'Ask pricing', 'Again, 지우기');
    const resetChipTag = getButtonTagByLabel(markup, 'Reset bottom search: 지우기');

    expect(markup).toContain('aria-label="Search suggestion: Again"');
    expect(markup).toContain('aria-label="Search suggestion: 지우기"');
    expect(markup).toContain('aria-label="Reset bottom search: 지우기"');
    expect(markup).toContain('data-ax-bottom-search-bar="reset-chip"');
    expect(markup).toContain('data-ax-bottom-search-bar="reset-chip-icon"');
    expect(markup).toContain('data-ax-bottom-search-bar="reset-chip-label"');
    expect(resetChipTag).toContain('min-width:0');
    expect(resetChipTag).toContain('max-width:min(18em, 100%)');
    expect(resetChipTag).toContain('background:color-mix(in srgb, var(--ax-color-primary-dark, #005f73) 18%, var(--ax-bg-input-textarea, transparent))');
    expect(resetChipTag).toContain('font-size:0.9em');
    expect(resetChipTag).toContain('line-height:1.35');
    expect(resetChipTag).toContain('padding:0.48em 0.75em');
    expect(resetChipTag).toContain('display:inline-flex');
    expect(resetChipTag).toContain('gap:0.5em');
    expect(resetChipTag).not.toContain('min-height:2.72em');
    expect(resetChipTag).not.toContain('font-size:0.92em');
    expect(resetChipTag).not.toContain('padding:0.42em 0.72em');
    expect(markup).not.toContain('data-ax-bottom-search-bar="reset-button-icon"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="reset-button-label"');
  });

  test('open close control uses the provided translated label', () => {
    const markup = renderBottomSearchBar(true, true, [message('assistant-1', 'assistant', 'Here is the latest answer.')], false, true, 'Ask docs', false, '지우기', undefined, undefined, '닫기');
    const closeButtonTag = getButtonTagByLabel(markup, '닫기');

    expect(markup).toContain('aria-label="닫기"');
    expect(markup).toContain('title="닫기"');
    expect(markup).toContain('data-ax-bottom-search-bar="close-button-icon"');
    expect(markup).toContain('data-ax-bottom-search-bar="close-button-label"');
    expect(markup).toContain('>닫기</span>');
    expect(closeButtonTag).toContain('min-width:4.45em');
    expect(closeButtonTag).toContain('min-height:2.72em');
    expect(closeButtonTag).toContain('font-size:0.92em');
    expect(closeButtonTag).toContain('padding:0.42em 0.72em');
    expect(closeButtonTag).not.toContain('font-size:1.03em');
    expect(closeButtonTag).not.toContain('padding:0.54em 0.94em');
    expect(markup).not.toContain('aria-label="Close bottom search"');
    expect(markup).not.toContain('>×</button>');
  });

  test('open close control falls back to English when label is blank', () => {
    const markup = renderBottomSearchBar(true, true, [message('assistant-1', 'assistant', 'Here is the latest answer.')], false, true, 'Ask docs', false, 'Clear', undefined, undefined, '   ');

    expect(markup).toContain('aria-label="Close"');
    expect(markup).toContain('title="Close"');
    expect(markup).toContain('data-ax-bottom-search-bar="close-button-icon"');
    expect(markup).toContain('data-ax-bottom-search-bar="close-button-label"');
    expect(markup).toContain('>Close</span>');
    expect(markup).not.toContain('aria-label="Close bottom search"');
  });

  test('closed launcher uses themed button image while reset and submit stay plain', () => {
    const themedButton: AXTheme = {
      buttonImageUrl: 'https://example.com/static-launcher.png',
      buttonAnimationImageUrl: 'https://example.com/animated-launcher.gif',
      buttonBorderRadius: '18px',
      styles: {
        button: {
          wrapper: { outline: '2px solid rgb(1, 2, 3)' },
          orb: { opacity: 0.42 },
          label: { letterSpacing: '0.12em' },
        },
        input: {
          sendButton: { boxShadow: '0 0 0 2px rgb(4, 5, 6)' },
        },
        popover: {
          closeButton: { textTransform: 'uppercase' },
        },
      },
    };

    const idleMarkup = renderBottomSearchBar(false, true, [message('assistant-1', 'assistant', 'Idle answer')], false, true, 'Ask docs', false, 'Clear', themedButton);
    const busyMarkup = renderBottomSearchBar(false, true, [message('assistant-1', 'assistant', 'Busy answer')], true, true, 'Ask docs', false, 'Clear', themedButton);
    const openMarkup = renderBottomSearchBar(true, true, [message('assistant-1', 'assistant', 'Open answer')], false, true, 'Ask docs', false, 'Clear', themedButton);
    const idleLauncherTag = getBottomSearchLauncherTag(idleMarkup);
    const busyLauncherTag = getBottomSearchLauncherTag(busyMarkup);

    expect(idleMarkup).toContain('data-ax-bottom-search-bar="launcher"');
    expect(idleMarkup).toContain('data-ax-bottom-search-bar="launcher-image"');
    expect(idleMarkup).toContain('src="https://example.com/static-launcher.png"');
    expect(idleMarkup).toContain('alt=""');
    expect(idleMarkup).toContain('aria-hidden="true"');
    expect(idleMarkup).toContain('border-radius:18px');
    expect(idleMarkup).toContain('outline:2px solid rgb(1, 2, 3)');
    expect(idleLauncherTag).toContain('border:none');
    expect(idleLauncherTag).toContain('box-shadow:none');
    expect(idleLauncherTag).toContain('animation:none');
    expect(idleMarkup).not.toContain('src="https://example.com/animated-launcher.gif"');
    expect(idleMarkup).not.toContain('data-ax-bottom-search-bar="launcher-idle-ring"');
    expect(idleMarkup).not.toContain('data-ax-bottom-search-bar="launcher-idle-glow"');
    expect(idleMarkup).not.toContain('data-ax-bottom-search-bar="launcher-busy-spin"');
    expect(idleMarkup).not.toContain('data-ax-bottom-search-bar="launcher-busy-pulse"');
    expect(idleMarkup).not.toContain('data-ax-bottom-search-bar="reset-button-image"');
    expect(idleMarkup).not.toContain('data-ax-search-bar="submit-button-image"');
    expect(idleMarkup).not.toContain('letter-spacing:0.12em');

    expect(busyMarkup).toContain('data-ax-bottom-search-bar="launcher-image"');
    expect(busyMarkup).toContain('src="https://example.com/animated-launcher.gif"');
    expect(busyLauncherTag).toContain('border:none');
    expect(busyLauncherTag).toContain('box-shadow:none');
    expect(busyLauncherTag).toContain('animation:none');
    expect(busyMarkup).not.toContain('src="https://example.com/static-launcher.png"');
    expect(busyMarkup).not.toContain('data-ax-bottom-search-bar="launcher-idle-ring"');
    expect(busyMarkup).not.toContain('data-ax-bottom-search-bar="launcher-idle-glow"');
    expect(busyMarkup).not.toContain('data-ax-bottom-search-bar="launcher-busy-spin"');
    expect(busyMarkup).not.toContain('data-ax-bottom-search-bar="launcher-busy-pulse"');
    expect(busyMarkup).not.toContain('data-ax-bottom-search-bar="reset-button-image"');
    expect(busyMarkup).not.toContain('data-ax-search-bar="submit-button-image"');

    expect(openMarkup).not.toContain('data-ax-bottom-search-bar="reset-button-label"');
    expect(openMarkup).toContain('>Run</button>');
    expect(openMarkup).toContain('box-shadow:0 0 0 2px rgb(4, 5, 6)');
    expect(openMarkup).toContain('text-transform:uppercase');
    expect(openMarkup).not.toContain('data-ax-bottom-search-bar="launcher-image"');
    expect(openMarkup).not.toContain('data-ax-bottom-search-bar="reset-button-image"');
    expect(openMarkup).not.toContain('data-ax-bottom-search-bar="reset-button-orb"');
    expect(openMarkup).not.toContain('data-ax-search-bar="submit-button-image"');
  });

  test('busy closed launcher falls back to static launcher image without an animation image', () => {
    const themedButton: AXTheme = {
      buttonImageUrl: 'https://example.com/static-launcher.png',
    };

    const markup = renderBottomSearchBar(false, true, [message('assistant-1', 'assistant', 'Busy answer')], true, true, 'Ask docs', false, 'Clear', themedButton);

    expect(markup).toContain('data-ax-bottom-search-bar="launcher-image"');
    expect(markup).toContain('src="https://example.com/static-launcher.png"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="launcher-busy-spin"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="launcher-busy-pulse"');
  });

  test('open surface renders onboarding chips then one input card before user messages', () => {
    const markup = renderBottomSearchBar(true, true, [message('assistant-1', 'assistant', 'Here is the latest answer.')], false, true, '', false);
    const previewIndex = markup.indexOf('data-ax-bottom-search-bar="preview"');
    const previewBodyIndex = markup.indexOf('data-ax-bottom-search-bar="preview-body"');
    const inputIndex = markup.indexOf('data-ax-bottom-search-bar="input"');
    const chipsIndex = markup.indexOf('data-ax-bottom-search-bar="chips"');
    const askPricingChipIndex = markup.indexOf('aria-label="Search suggestion: Ask pricing"');
    const askDocsChipIndex = markup.indexOf('aria-label="Search suggestion: Ask docs"');
    const searchIndex = markup.indexOf('role="search"');
    const previewCloseIndex = markup.indexOf('</article>', previewIndex);
    const chipsStyle = getBottomSearchChipsStyle(markup);

    expect(markup).toContain('data-ax-bottom-search-bar="surface"');
    expect(markup).toContain('aria-label="AXSDK answer preview"');
    expect(markup).toContain('title="Translated AI preview"');
    expect(markup).not.toContain('Latest AI reply');
    expect(markup).toContain('Here is the latest answer.');
    expect(markup).toContain('data-ax-bottom-search-bar="preview-body"');
    expect(markup).toContain('overflow:hidden');
    expect(markup).toContain('position:sticky');
    expect(markup).toContain('background:var(--ax-bg-popover)');
    expect(markup).toContain('border:1px solid var(--ax-border-primary');
    expect(markup).not.toContain('aria-label="Clear"');
    expect(markup).not.toContain('title="Clear"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="reset-button-orb"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="reset-button-icon"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="reset-button-label"');
    expect(markup).not.toContain('>Reset<');
    expect(markup).toContain('aria-label="Close"');
    expect(markup).toContain('title="Close"');
    expect(markup).toContain('data-ax-bottom-search-bar="close-button-icon"');
    expect(markup).toContain('data-ax-bottom-search-bar="close-button-label"');
    expect(markup).toContain('>Close</span>');
    expect(markup).not.toContain('aria-label="Close bottom search"');
    expect(markup).toContain('aria-label="AXSDK search suggestions"');
    expect(markup).toContain('Search suggestion: Ask pricing');
    expect(markup).toContain('Search suggestion: Ask docs');
    expect(markup).not.toContain('data-ax-bottom-search-bar="chips-scroll-region"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="chips-scroll-left"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="chips-scroll-right"');
    expect(markup).not.toContain('aria-label="Scroll search suggestions left"');
    expect(markup).not.toContain('aria-label="Scroll search suggestions right"');
    expect(markup).not.toContain('title="Scroll search suggestions left"');
    expect(markup).not.toContain('title="Scroll search suggestions right"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="chips-scroll-left-icon"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="chips-scroll-right-icon"');
    expect(markup).toContain('border-top:1px solid var(--ax-border-surface');
    expect(markup).toContain('linear-gradient(135deg, color-mix(in srgb, var(--ax-color-primary, #00b8db) 22%');
    expect(chipsStyle).toContain('display:flex');
    expect(chipsStyle).toContain('flex-wrap:wrap');
    expect(chipsStyle).toContain('align-items:flex-start');
    expect(chipsStyle).toContain('justify-content:center');
    expect(chipsStyle).toContain('gap:0.45em');
    expect(chipsStyle).toContain('padding:0.5em 0.75em 0.35em');
    expect(chipsStyle).not.toContain('overflow-x:auto');
    expect(chipsStyle).not.toContain('scrollbar-width:none');
    expect(chipsStyle).not.toContain('padding:0.5em 2.85em 0.35em');
    expect(markup).toContain('flex:0 1 auto');
    expect(markup).toContain('min-width:0');
    expect(markup).toContain('max-width:min(18em, 100%)');
    expect(markup).toContain('role="search"');
    expect(markup).toContain('value="current search"');
    expect(markup).toContain('autofocus=""');
    expect(markup).not.toContain('data-ax-search-bar="voice-dictation"');
    expect(markup).not.toContain('data-ax-search-bar="voice-status"');
    expect(markup).not.toContain('aria-label="Voice dictation is not available in this browser"');
    expect(markup).toContain('box-shadow:none');
    expect(previewIndex).toBeGreaterThan(-1);
    expect(previewBodyIndex).toBeGreaterThan(previewIndex);
    expect(chipsIndex).toBeGreaterThan(previewBodyIndex);
    expect(askPricingChipIndex).toBeGreaterThan(chipsIndex);
    expect(askDocsChipIndex).toBeGreaterThan(askPricingChipIndex);
    expect(askDocsChipIndex).toBeLessThan(inputIndex);
    expect(previewCloseIndex).toBeGreaterThan(chipsIndex);
    expect(inputIndex).toBeGreaterThan(previewCloseIndex);
    expect(searchIndex).toBeGreaterThan(inputIndex);
  });

  test('open surface renders powered-by attribution below the input card', () => {
    const markup = renderBottomSearchBar(true);
    const inputIndex = markup.indexOf('data-ax-bottom-search-bar="input"');
    const poweredByIndex = markup.indexOf('data-ax-powered-by="root"');
    const poweredByLinkIndex = markup.indexOf('data-ax-powered-by="link"');

    expect(markup).toContain('data-ax-powered-by="root"');
    expect(markup).toContain('data-ax-powered-by="link"');
    expect(markup).toContain('href="https://axsdk.ai"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain('Powered by AXSDK');
    expect(markup).toContain('pointer-events:none');
    expect(markup).toContain('pointer-events:auto');
    expect(poweredByIndex).toBeGreaterThan(inputIndex);
    expect(poweredByLinkIndex).toBeGreaterThan(poweredByIndex);
  });

  test('open surface omits chip scroll controls when no chips render', () => {
    const markup = renderBottomSearchBar(true, true, [message('assistant-1', 'assistant', 'Here is the latest answer.')], false, true, '', false, 'Clear', undefined, undefined, 'Close', '', '');

    expect(markup).toContain('data-ax-bottom-search-bar="preview"');
    expect(markup).toContain('data-ax-bottom-search-bar="input"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="chips"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="chips-scroll-region"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="chips-scroll-left"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="chips-scroll-right"');
    expect(markup).not.toContain('Scroll search suggestions left');
    expect(markup).not.toContain('Scroll search suggestions right');
    expect(markup).not.toContain('Search suggestion:');
  });

  test('open preview glows when assistant text exists and session is idle', () => {
    const markup = renderBottomSearchBar(true, true, [
      message('assistant-1', 'assistant', 'Here is the latest answer.'),
    ], false);
    const previewStyle = getBottomSearchPreviewStyle(markup);

    expect(previewStyle).toContain('ax-bottom-search-bar-preview-pulse');
    expect(previewStyle).toContain('0 0 10px 2px var(--ax-color-primary-light');
    expect(previewStyle).not.toContain('animation:none');
  });

  test('open preview does not glow without assistant text while session is idle', () => {
    const markup = renderBottomSearchBar(true, true, [
      message('user-1', 'user', 'Only user text'),
    ], false);
    const previewStyle = getBottomSearchPreviewStyle(markup);

    expect(previewStyle).toContain('animation:none');
    expect(previewStyle).not.toContain('ax-bottom-search-bar-preview-pulse');
    expect(previewStyle).not.toContain('0 0 10px 2px var(--ax-color-primary-light');
    expect(markup).toContain('Start a search');
  });

  test('open preview does not glow when assistant text exists and session is busy', () => {
    const markup = renderBottomSearchBar(true, true, [
      message('assistant-1', 'assistant', 'Busy answer'),
    ], true);
    const previewStyle = getBottomSearchPreviewStyle(markup);

    expect(previewStyle).toContain('animation:none');
    expect(previewStyle).not.toContain('ax-bottom-search-bar-preview-pulse');
    expect(previewStyle).not.toContain('0 0 10px 2px var(--ax-color-primary-light');
    expect(markup).toContain('Busy answer');
  });

  test('open preview header uses the shared enabled TTS toggle when provided', () => {
    const markup = renderBottomSearchBar(true, true, [
      message('user-1', 'user', 'User question should stay out of the voice header'),
      message('assistant-1', 'assistant', 'Here is the latest answer.'),
    ], false, true, 'Ask docs', false, 'Clear', undefined, ttsControl({ enabled: true }));

    expect(markup).toContain('aria-label="Mute voice"');
    expect(markup).toContain('title="Mute voice"');
    expect(markup).toContain('data-ax-bottom-search-bar="preview"');
    expect(markup).not.toContain('aria-label="Clear"');
    expect(markup).not.toContain('data-ax-bottom-search-bar="reset-button-icon"');
    expect(markup).toContain('data-ax-bottom-search-bar="close-button-icon"');
    expect(markup).toContain('data-ax-bottom-search-bar="close-button-label"');
    expect(markup).toContain('aria-label="Close"');
    expect(markup).toContain('title="Close"');
    expect(markup).not.toContain('aria-label="Close bottom search"');
    expect(markup).not.toContain('Search suggestion: Ask pricing');
    expect(markup).toContain('Here is the latest answer.');
    expect(markup).not.toContain('<span title="Ask docs"');
    expect(markup).not.toContain('Ask docs</span>');
    expect(markup).not.toContain('Translated AI preview');
    expect(markup).not.toContain('User question should stay out of the voice header');
  });

  test('open preview header uses the shared disabled TTS toggle label', () => {
    const markup = renderBottomSearchBar(true, true, [
      message('assistant-1', 'assistant', 'Here is the latest answer.'),
    ], false, true, 'Ask docs', false, 'Clear', undefined, ttsControl({ enabled: false }));

    expect(markup).toContain('aria-label="Unmute voice"');
    expect(markup).toContain('title="Unmute voice"');
    expect(markup).not.toContain('<span title="Ask docs"');
    expect(markup).not.toContain('Translated AI preview');
  });

  test('open preview header uses the shared unlock-needed TTS toggle label', () => {
    const markup = renderBottomSearchBar(true, true, [
      message('assistant-1', 'assistant', 'Here is the latest answer.'),
    ], false, true, 'Ask docs', false, 'Clear', undefined, ttsControl({ needsUnlock: true }));

    expect(markup).toContain('aria-label="Tap to enable voice"');
    expect(markup).toContain('title="Tap to enable voice"');
    expect(markup).not.toContain('<span title="Ask docs"');
    expect(markup).not.toContain('Translated AI preview');
  });

  test('open preview renders the latest assistant message error by message URL', () => {
    AXSDK.getErrorStore().getState().addError({
      url: 'axsdk://assistant-error',
      method: 'message',
      status: 500,
      statusText: 'Message failed',
      message: 'Open preview message error',
    });

    const markup = renderBottomSearchBar(true, true, [
      message('user-1', 'user', 'User query'),
      message('assistant-error', 'assistant', 'Assistant answer with an error.'),
    ]);

    expect(markup).toContain('data-ax-bottom-search-bar="preview"');
    expect(markup).toContain('Assistant answer with an error.');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Open preview message error');
  });

  test('open preview renders the latest assistant info error alert and message', () => {
    const markup = renderBottomSearchBar(true, true, [
      message('user-1', 'user', 'User query'),
      assistantMessageWithInfoError(
        'assistant-info-error',
        'Assistant answer with inline error.',
        'RateLimitError',
        'Inline assistant failure from message info.',
      ),
    ]);

    expect(markup).toContain('data-ax-bottom-search-bar="preview-body"');
    expect(markup).toContain('Assistant answer with inline error.');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Error · RateLimitError:');
    expect(markup).toContain('Inline assistant failure from message info.');
  });

  test('open preview ignores older assistant info error when a later assistant is latest', () => {
    const markup = renderBottomSearchBar(true, true, [
      assistantMessageWithInfoError(
        'assistant-old-error',
        'Older assistant answer with inline error.',
        'OldError',
        'Older inline assistant failure.',
      ),
      message('user-1', 'user', 'User query'),
      message('assistant-latest', 'assistant', 'Latest assistant answer without inline error.'),
    ]);

    expect(markup).toContain('data-ax-bottom-search-bar="preview-body"');
    expect(markup).toContain('Latest assistant answer without inline error.');
    expect(markup).not.toContain('Older assistant answer with inline error.');
    expect(markup).not.toContain('role="alert"');
    expect(markup).not.toContain('Error · OldError:');
    expect(markup).not.toContain('Older inline assistant failure.');
  });

  test('open preview does not render unrelated message-scoped errors', () => {
    AXSDK.getErrorStore().getState().addError({
      url: 'axsdk://unrelated-assistant',
      method: 'message',
      status: 500,
      statusText: 'Message failed',
      message: 'Unrelated preview message error',
    });

    const markup = renderBottomSearchBar(true, true, [
      message('user-1', 'user', 'User query'),
      message('assistant-error', 'assistant', 'Assistant answer without the unrelated error.'),
    ]);

    expect(markup).toContain('data-ax-bottom-search-bar="preview"');
    expect(markup).toContain('Assistant answer without the unrelated error.');
    expect(markup).not.toContain('role="alert"');
    expect(markup).not.toContain('Unrelated preview message error');
  });

  test('active idle session shows shortcut chips and reset chip instead of onboarding chips', () => {
    const markup = renderBottomSearchBar(true, true, [message('assistant-1', 'assistant', 'Here is the latest answer.')], false, true, 'Ask docs', true);

    expect(markup).toContain('Search suggestion: Again');
    expect(markup).toContain('Search suggestion: Continue');
    expect(markup).toContain('data-ax-bottom-search-bar="reset-chip"');
    expect(markup).not.toContain('Search suggestion: Ask pricing');
    expect(markup).not.toContain('Search suggestion: Ask docs');
  });

  test('active idle session builds shortcut chips from assistant strong markdown plus base actions', () => {
    const markup = renderBottomSearchBar(true, true, [
      message('user-1', 'user', 'Ask docs'),
      message('assistant-1', 'assistant', 'Try **Premium apples** or __Order history__. Then **다시** if needed.'),
    ], false, true, 'Ask docs', true, '지우기', undefined, undefined, 'Close', 'Ask pricing', '다시, 계속');

    expect(markup).toContain('aria-label="Search suggestion: Premium apples"');
    expect(markup).toContain('aria-label="Search suggestion: Order history"');
    expect(markup).toContain('aria-label="Search suggestion: 다시"');
    expect(markup).toContain('aria-label="Search suggestion: 계속"');
    expect(markup).toContain('aria-label="Reset bottom search: 지우기"');
    expect(markup).toContain('data-ax-bottom-search-bar="reset-chip"');
    expect(markup).not.toContain('Search suggestion: Ask pricing');
  });

  test('active busy session hides chips until the session is idle', () => {
    const markup = renderBottomSearchBar(true, true, [
      message('user-1', 'user', 'Ask docs'),
      message('assistant-1', 'assistant', 'Busy **Premium apples**'),
    ], true, true, 'Ask docs', true);

    expect(markup).not.toContain('data-ax-bottom-search-bar="chips"');
    expect(markup).not.toContain('aria-label="Search suggestion: Premium apples"');
    expect(markup).not.toContain('Search suggestion: Again');
    expect(markup).not.toContain('Search suggestion: Continue');
    expect(markup).not.toContain('data-ax-bottom-search-bar="reset-chip"');
  });

  test('open preview header derives the latest user message when prop text is absent', () => {
    const markup = renderBottomSearchBar(true, true, [
      message('user-old', 'user', 'Older user question'),
      message('assistant-1', 'assistant', 'Assistant answer'),
      message('user-latest', 'user', 'Newest user question'),
    ], false, true, '');

    expect(markup).toContain('title="Newest user question"');
    expect(markup).toContain('Newest user question');
    expect(markup).not.toContain('title="Older user question"');
    expect(markup).not.toContain('Latest AI reply');
  });

  test('open preview header uses a neutral fallback without user text', () => {
    const markup = renderBottomSearchBar(true, true, [
      message('assistant-1', 'assistant', 'Assistant answer'),
    ], false, true, '');

    expect(markup).toContain('title="Translated AI preview"');
    expect(markup).toContain('Translated AI preview');
    expect(markup).not.toContain('title="AI preview"');
    expect(markup).not.toContain('Latest AI reply');
  });

  test('preview renders only latest assistant text parts as markdown', () => {
    const assistantWithNonTextParts = {
      info: {
        id: 'assistant-markdown',
        role: 'assistant',
        sessionID: 'session-1',
        time: { created: Date.now() },
        agent: 'agent',
        model: { providerID: 'provider', modelID: 'model' },
      },
      parts: [
        { type: 'text', text: '**Bold latest**\n\n- markdown item' },
        { type: 'reasoning', text: 'hidden reasoning text' },
        { type: 'tool', tool: 'hidden-tool', state: { status: 'completed', output: 'hidden tool output' } },
      ],
    } as ChatMessage;

    const markup = renderBottomSearchBar(true, true, [
      message('assistant-old', 'assistant', 'Older answer'),
      message('user-1', 'user', 'User query'),
      assistantWithNonTextParts,
    ]);

    expect(markup).toContain('Bold latest');
    expect(markup).toContain('<strong');
    expect(markup).toContain('<li');
    expect(markup).toContain('markdown item');
    expect(markup).not.toContain('Older answer');
    expect(markup).not.toContain('hidden reasoning text');
    expect(markup).not.toContain('hidden-tool');
    expect(markup).not.toContain('hidden tool output');
    expect(markup).not.toContain('var(--ax-bg-assistant-message)');
  });

  test('desktop open surface stays bottom centered with capped width', () => {
    const markup = renderBottomSearchBar(true, true);
    const surfaceStyle = getBottomSearchSurfaceStyle(markup);
    const previewStyle = getBottomSearchPreviewStyle(markup);

    expect(markup).toContain('left:50%');
    expect(markup).toContain('width:min(720px, calc(100vw - 2em))');
    expect(markup).toContain('max-width:calc(100vw - 2em)');
    expect(markup).toContain('transform:translate(-50%, 0)');
    expect(surfaceStyle).toContain('max-height:calc(100dvh - max(1em, env(safe-area-inset-bottom)) - max(1em, env(safe-area-inset-top)) - 1em)');
    expect(surfaceStyle).toContain('min-height:0');
    expect(previewStyle).toContain('flex:1 1 auto');
    expect(previewStyle).toContain('max-height:none');
    expect(previewStyle).toContain('min-height:8em');
  });

  test('mobile open surface uses full-width placement without capped calc width', () => {
    const markup = renderBottomSearchBar(true, false);

    expect(markup).toContain('left:0');
    expect(markup).toContain('right:0');
    expect(markup).toContain('width:auto');
    expect(markup).toContain('padding-left:max(0.75em, env(safe-area-inset-left))');
    expect(markup).toContain('padding-right:max(0.75em, env(safe-area-inset-right))');
    expect(markup).toContain('transform:translateY(0)');
    expect(markup).not.toContain('width:min(720px, calc(100vw - 2em))');
    expect(markup).not.toContain('max-width:calc(100vw - 2em)');
  });
});
