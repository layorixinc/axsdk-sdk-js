import { describe, expect, test } from 'bun:test';

import {
  resolveAXUITarget,
  resolveAXUIVariant,
  type AXUITargetReference,
} from '../src/components/AXUITargets';

describe('resolveAXUIVariant', () => {
  test('defaults to bottom search bar when no variant config is provided', () => {
    expect(resolveAXUIVariant({})).toBe('bottomSearchBar');
  });

  test('uses ui.variant when direct variant is absent', () => {
    expect(resolveAXUIVariant({ ui: { variant: 'searchBar' } })).toBe('searchBar');
  });

  test('supports the bottom search bar variant from ui config', () => {
    expect(resolveAXUIVariant({ ui: { variant: 'bottomSearchBar' } })).toBe('bottomSearchBar');
  });

  test('prefers direct variant over ui.variant', () => {
    expect(resolveAXUIVariant({ variant: 'fab', ui: { variant: 'searchBar' } })).toBe('fab');
  });
});

describe('resolveAXUITarget', () => {
  test('returns null when no target is provided', () => {
    expect(resolveAXUITarget(undefined, () => null)).toBeNull();
  });

  test('resolves a string target with the provided lookup function', () => {
    const node = { id: 'ax-search-root' } as HTMLElement;

    expect(resolveAXUITarget('ax-search-root', (id) => (id === 'ax-search-root' ? node : null))).toBe(node);
  });

  test('returns null when a string target cannot be found', () => {
    expect(resolveAXUITarget('missing-root', () => null)).toBeNull();
  });

  test('returns HTMLElement targets as-is', () => {
    const node = { id: 'ax-answer-root' } as HTMLElement;
    const target: AXUITargetReference = node;

    expect(resolveAXUITarget(target, () => null)).toBe(node);
  });
});
