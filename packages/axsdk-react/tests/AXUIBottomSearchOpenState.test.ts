import { describe, expect, test } from 'bun:test';

function extractConstArrowBody(source: string, functionName: string): string {
  const match = source.match(new RegExp(`const ${functionName} = \\(\\) => \\{([\\s\\S]*?)\\n  \\};`));

  expect(match).not.toBeNull();
  return match?.[1] ?? '';
}

function extractFunctionBody(source: string, functionName: string): string {
  const match = source.match(new RegExp(`function ${functionName}\\(([^)]*)\\) \\{([\\s\\S]*?)\\n  \\}`));

  expect(match).not.toBeNull();
  return match?.[2] ?? '';
}

describe('AXUI bottomSearchBar open state parity', () => {
  test('bottom search bar is controlled by core chat open state', async () => {
    const source = await Bun.file(new URL('../src/components/AXUI.tsx', import.meta.url)).text();
    const bottomSearchBarMarkup = source.match(/<AXBottomSearchBar[\s\S]*?\/>/)?.[0] ?? '';

    expect(source).not.toContain('bottomSearchBarOpen');
    expect(source).not.toContain('setBottomSearchBarOpen');
    expect(bottomSearchBarMarkup).toContain('open={isOpen}');
    expect(bottomSearchBarMarkup).toContain('onOpenChange={handleBottomSearchBarOpenChange}');
    expect(bottomSearchBarMarkup).toContain('ttsControl={ttsControl}');
  });

  test('bottom open-change uses the same voice intent path as the fab open path', async () => {
    const source = await Bun.file(new URL('../src/components/AXUI.tsx', import.meta.url)).text();
    const openHelperBody = extractConstArrowBody(source, 'openChatFromUserIntent');
    const fabClickBody = extractConstArrowBody(source, 'handleClick');
    const bottomOpenChangeBody = extractFunctionBody(source, 'handleBottomSearchBarOpenChange');

    expect(openHelperBody).toContain("AXSDK.eventBus().emit('voice.user-intent', undefined);");
    expect(openHelperBody).toContain('unlockAudio()');
    expect(openHelperBody).toContain('primePermissions()');
    expect(openHelperBody).toContain('setIsOpen(true);');

    expect(fabClickBody).toContain('openChatFromUserIntent();');
    expect(fabClickBody).toContain('setIsOpen(false);');
    expect(fabClickBody).not.toContain('setIsOpen(!isOpen);');

    expect(bottomOpenChangeBody).toContain('if (open)');
    expect(bottomOpenChangeBody).toContain('openChatFromUserIntent();');
    expect(bottomOpenChangeBody).toContain('setIsOpen(false);');
    expect(bottomOpenChangeBody).not.toContain('setIsOpen(!isOpen);');
  });

  test('idle-to-busy auto-close includes fab and bottomSearchBar only', async () => {
    const source = await Bun.file(new URL('../src/components/AXUI.tsx', import.meta.url)).text();
    const autoCloseEffect = source.match(/const currentStatus = session\?\.status;[\s\S]*?prevStatusRef\.current = currentStatus;/)?.[0] ?? '';

    expect(autoCloseEffect).toContain("(resolvedVariant === 'fab' || resolvedVariant === 'bottomSearchBar')");
    expect(autoCloseEffect).toContain("(prevStatusRef.current === 'idle' || !prevStatusRef.current) && currentStatus === 'busy'");
    expect(autoCloseEffect).toContain('setIsOpen(false);');
    expect(autoCloseEffect).not.toContain("resolvedVariant === 'searchBar'");
    expect(source).toContain('}, [resolvedVariant, session?.status, setIsOpen]);');
    expect(source).not.toContain("if ((prevStatusRef.current === 'idle' || !prevStatusRef.current) && currentStatus === 'busy')");
  });
});
