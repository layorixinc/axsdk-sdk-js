export interface AXSearchOnboardingContent {
  onboardingText?: string;
  latestUserText?: string;
}

function normalizeText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export type AXSearchOnboardingTextSelectHandler = (text: string) => void;

export function buildAXSearchOnboardingContent(
  onboardingText: string | undefined,
  latestUserText: string | undefined,
): AXSearchOnboardingContent {
  return {
    onboardingText: normalizeText(onboardingText),
    latestUserText: normalizeText(latestUserText),
  };
}

export function getAXSearchOnboardingSelectableTexts(content: AXSearchOnboardingContent): string[] {
  return [content.onboardingText, content.latestUserText].flatMap((text) => {
    const normalized = normalizeText(text);
    return normalized ? [normalized] : [];
  });
}

export function selectAXSearchOnboardingText(
  text: string,
  onTextSelect: AXSearchOnboardingTextSelectHandler | undefined,
): void {
  const normalized = normalizeText(text);
  if (!normalized) return;
  onTextSelect?.(normalized);
}
