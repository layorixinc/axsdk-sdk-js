import {
  buildAXSearchOnboardingContent,
} from '../AXSearchOnboardingContent';

export function buildAXBottomSearchBarChipTexts(
  onboardingText: string | undefined,
  _latestUserText: string | undefined,
  shortcutText: string | undefined,
  showShortcuts: boolean,
  assistantText?: string,
): string[] {
  const content = buildAXSearchOnboardingContent(onboardingText, undefined);
  const seen = new Set<string>();
  const add = (text: string | undefined): string[] => {
    const normalized = text?.trim();
    if (!normalized || seen.has(normalized)) return [];
    seen.add(normalized);
    return [normalized];
  };

  if (showShortcuts) {
    return [
      ...extractMarkdownStrongTexts(assistantText).flatMap(add),
      ...(shortcutText?.split(',').flatMap(add) ?? []),
    ];
  }

  return [
    ...(content.onboardingText?.split(',').flatMap(add) ?? []),
  ];
}

function extractMarkdownStrongTexts(text: string | undefined): string[] {
  if (!text) return [];

  const matches: string[] = [];
  const pattern = /(?<!\\)(?:\*\*([\s\S]+?)(?<!\\)\*\*|__([\s\S]+?)(?<!\\)__)/g;
  for (const match of text.matchAll(pattern)) {
    const normalized = (match[1] ?? match[2])?.replace(/\s+/g, ' ').trim();
    if (normalized) matches.push(normalized);
  }

  return matches;
}
