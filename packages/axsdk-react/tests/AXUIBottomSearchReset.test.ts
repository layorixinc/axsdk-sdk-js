import { describe, expect, test } from 'bun:test';

function extractFunctionBody(source: string, functionName: string): string {
  const match = source.match(new RegExp(`function ${functionName}\\(\\) \\{([\\s\\S]*?)\\n  \\}`));

  expect(match).not.toBeNull();
  return match?.[1] ?? '';
}

describe('AXUI bottomSearchBar reset behavior', () => {
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
});
