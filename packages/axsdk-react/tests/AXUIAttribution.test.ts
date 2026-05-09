import { describe, expect, test } from 'bun:test';

describe('AXUI powered-by attribution wiring', () => {
  test('fab and searchBar variants use the shared internal attribution component', async () => {
    const source = await Bun.file(new URL('../src/components/AXUI.tsx', import.meta.url)).text();
    const fabAttributionMarkup = source.match(/<AXButton[\s\S]*?<AXPoweredBy[\s\S]*?\/>/)?.[0] ?? '';

    expect(source).toContain("import { AXPoweredBy } from './AXPoweredBy';");
    expect(source).toContain('const searchBarAttribution = (');
    expect(source).toContain('{searchBarCard}\n        {searchBarAttribution}');
    expect(source).toContain('{!searchBarHostTarget && searchBarAttribution}');
    expect(fabAttributionMarkup).toContain('<AXPoweredBy');
    expect(fabAttributionMarkup).toContain("bottom: '0.25em'");
    expect(fabAttributionMarkup).toContain("right: '0.25em'");
    expect(source).not.toContain('href="https://axsdk.ai"');
    expect(source).not.toContain("{AXSDK.t('poweredBy')}");
  });

  test('bottomSearchBar variant reaches the shared attribution through the open surface component', async () => {
    const axuiSource = await Bun.file(new URL('../src/components/AXUI.tsx', import.meta.url)).text();
    const bottomSearchBarSource = await Bun.file(new URL('../src/components/AXBottomSearchBar.tsx', import.meta.url)).text();
    const bottomSearchBarMarkup = axuiSource.match(/<AXBottomSearchBar[\s\S]*?\/>/)?.[0] ?? '';
    const openSurfaceMarkup = bottomSearchBarSource.match(/\{open && \([\s\S]*?<AXPoweredBy[\s\S]*?<\/section>/)?.[0] ?? '';

    expect(bottomSearchBarMarkup).toContain('open={isOpen}');
    expect(bottomSearchBarSource).toContain("import { AXPoweredBy } from './AXPoweredBy';");
    expect(openSurfaceMarkup).toContain('data-ax-bottom-search-bar="input"');
    expect(openSurfaceMarkup).toContain('<AXPoweredBy');
  });

  test('AXPoweredBy stays out of the public component barrel', async () => {
    const barrelSource = await Bun.file(new URL('../src/components/index.ts', import.meta.url)).text();

    expect(barrelSource).not.toContain('AXPoweredBy');
  });
});