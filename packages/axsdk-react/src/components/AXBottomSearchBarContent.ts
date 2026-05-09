import {
  buildAXSearchOnboardingContent,
} from './AXSearchOnboardingContent';

export function buildAXBottomSearchBarChipTexts(
  onboardingText: string | undefined,
  latestUserText: string | undefined,
  shortcutText: string | undefined,
  showShortcuts: boolean,
): string[] {
  const content = buildAXSearchOnboardingContent(onboardingText, latestUserText);
  const seen = new Set<string>();
  const add = (text: string | undefined): string[] => {
    const normalized = text?.trim();
    if (!normalized || seen.has(normalized)) return [];
    seen.add(normalized);
    return [normalized];
  };

  if (showShortcuts) {
    return shortcutText?.split(',').flatMap(add) ?? [];
  }

  return [
    ...(content.onboardingText?.split(',').flatMap(add) ?? []),
    ...add(content.latestUserText),
  ];
}
