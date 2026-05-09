export type AXUIVariant = 'fab' | 'searchBar' | 'bottomSearchBar';

export type AXUITargetReference = string | HTMLElement;

export interface AXUITargets {
  searchBar?: AXUITargetReference;
  answerPanel?: AXUITargetReference;
}

export interface AXUIConfig {
  variant?: AXUIVariant;
  targets?: AXUITargets;
}

export interface AXUIVariantOptions {
  variant?: AXUIVariant;
  ui?: AXUIConfig;
}

export function resolveAXUIVariant({ variant, ui }: AXUIVariantOptions): AXUIVariant {
  return variant ?? ui?.variant ?? 'fab';
}

export function resolveAXUITarget(
  target: AXUITargetReference | undefined,
  getElementById: (id: string) => HTMLElement | null,
): HTMLElement | null {
  if (!target) return null;
  if (typeof target === 'string') return getElementById(target);

  return target;
}
