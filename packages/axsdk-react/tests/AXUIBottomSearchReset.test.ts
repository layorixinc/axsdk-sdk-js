import { describe, expect, test } from 'bun:test';

function extractFunctionBody(source: string, functionName: string): string {
  const match = source.match(new RegExp(`function ${functionName}\\(([^)]*)\\) \\{([\\s\\S]*?)\\n {2}\\}`));

  expect(match).not.toBeNull();
  return match?.[2] ?? '';
}

describe('AXUI bottomSearchBar reset behavior', () => {
  test('bottom search submit sends without cancelling or resetting the chat session', async () => {
    const source = await Bun.file(new URL('../src/components/AXUI.tsx', import.meta.url)).text();
    const bottomSearchBarMarkup = source.match(/<AXBottomSearchBar[\s\S]*?\/>/)?.[0] ?? '';
    const bottomSendBody = extractFunctionBody(source, 'handleBottomSearchBarSend');
    const searchSendBody = source.match(/const handleSearchBarSend = \(text: string\) => \{([\s\S]*?)\n {2}\}/)?.[1] ?? '';

    expect(bottomSearchBarMarkup).toContain('onSearch={handleBottomSearchBarSend}');
    expect(bottomSearchBarMarkup).not.toContain('onSearch={handleSearchBarSend}');
    expect(bottomSendBody).toContain('setSearchBarValue(trimmedText);');
    expect(bottomSendBody).toContain('setSearchBarInputValue(trimmedText);');
    expect(bottomSendBody).toContain('handleSend(trimmedText);');
    expect(bottomSendBody).not.toContain('axsdk.chat.cancel');
    expect(bottomSendBody).not.toContain('resetSession');
    expect(searchSendBody).toContain('AXSDK.resetSession();');
  });

  test('search surfaces use the translated search submit button label', async () => {
    const source = await Bun.file(new URL('../src/components/AXUI.tsx', import.meta.url)).text();

    expect(source).toContain('buttonLabel={AXSDK.t("chatSearchSubmit")}');
    expect(source).not.toContain('buttonLabel="실행"');
  });

  test('bottom search reset clears controlled and persisted input before resetting the chat', async () => {
    const source = await Bun.file(new URL('../src/components/AXUI.tsx', import.meta.url)).text();
    const bottomClearBody = extractFunctionBody(source, 'handleBottomSearchBarClear');
    const localClearIndex = bottomClearBody.indexOf("setSearchBarValue('');");
    const persistedClearIndex = bottomClearBody.indexOf("setSearchBarInputValue('');");
    const resetIndex = bottomClearBody.indexOf('handleClear();');

    expect(localClearIndex).toBeGreaterThanOrEqual(0);
    expect(persistedClearIndex).toBeGreaterThanOrEqual(0);
    expect(resetIndex).toBeGreaterThanOrEqual(0);
    expect(localClearIndex).toBeLessThan(resetIndex);
    expect(persistedClearIndex).toBeLessThan(resetIndex);
  });

  test('uses the bottom-specific clear handler without broadening fab clear semantics', async () => {
    const source = await Bun.file(new URL('../src/components/AXUI.tsx', import.meta.url)).text();
    const bottomSearchBarMarkup = source.match(/<AXBottomSearchBar[\s\S]*?\/>/)?.[0] ?? '';
    const chatInputMarkup = source.match(/<AXChatMessageInput[\s\S]*?\/>/)?.[0] ?? '';
    const genericClearBody = extractFunctionBody(source, 'handleClear');

    expect(bottomSearchBarMarkup).toContain('onClear={handleBottomSearchBarClear}');
    expect(chatInputMarkup).toContain('onClear={handleClear}');
    expect(chatInputMarkup).not.toContain('handleBottomSearchBarClear');
    expect(genericClearBody).not.toContain('setSearchBarValue');
    expect(genericClearBody).not.toContain('setSearchBarInputValue');
  });

  test('keeps shortcut chips eligible after a session completes with messages retained', async () => {
    const source = await Bun.file(new URL('../src/components/AXUI.tsx', import.meta.url)).text();
    const bottomSearchBarMarkup = source.match(/<AXBottomSearchBar[\s\S]*?\/>/)?.[0] ?? '';

    expect(source).toContain('const hasSession = Boolean(session);');
    expect(source).not.toContain('const hasActiveSession = Boolean(session && !sessionClosed);');
    expect(bottomSearchBarMarkup).toContain('showShortcutChips={hasSession}');
    expect(bottomSearchBarMarkup).not.toContain('showShortcutChips={hasActiveSession}');
  });
});
