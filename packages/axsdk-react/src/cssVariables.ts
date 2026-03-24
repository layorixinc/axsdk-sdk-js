import type { AXTheme } from './theme';
import { mergeTheme } from './defaultTheme';

/**
 * Injects all AX theme CSS custom properties onto `root`'s inline style.
 *
 * Variables are scoped to the AXUI portal root element so they don't
 * escape to the host page. Components read from `var(--ax-*)` in
 * their inline styles.
 *
 * @param root     The portal root HTMLElement (the `div` appended to `document.body`).
 * @param theme    The (possibly partial) user theme. Merged with defaults internally.
 */
export function injectCSSVariables(root: HTMLElement, theme?: AXTheme): void {
  const merged = mergeTheme(theme);
  const mode = merged.colorMode ?? 'dark';

  const p = merged.colors?.primary ?? {};
  const bg = mode === 'dark' ? (merged.colors?.bg?.dark ?? {}) : (merged.colors?.bg?.light ?? {});
  const text = merged.colors?.text ?? {};
  const border = merged.colors?.border ?? {};

  const vars: Record<string, string | undefined> = {
    '--ax-color-primary':       p.primary,
    '--ax-color-primary-dark':  p.primaryDark,
    '--ax-color-primary-light': p.primaryLight,
    '--ax-color-primary-muted': p.primaryMuted,

    '--ax-color-accent1': p.accent1,
    '--ax-color-accent2': p.accent2,
    '--ax-color-accent3': p.accent3,
    '--ax-color-accent4': p.accent4,

    '--ax-bg-base':              bg.base,
    '--ax-bg-popover':           bg.popover,
    '--ax-bg-user-message':      bg.userMessage,
    '--ax-bg-assistant-message': bg.assistantMessage,
    '--ax-bg-question-dialog':   bg.questionDialog,
    '--ax-bg-input-textarea':    bg.inputTextarea,
    '--ax-bg-overlay':           bg.overlay,
    '--ax-bg-error':             bg.error,

    '--ax-text-primary':   text.primary,
    '--ax-text-muted':     text.muted,
    '--ax-text-dim':       text.dim,
    '--ax-text-assistant': text.assistant,
    '--ax-text-timestamp': text.timestamp,
    '--ax-text-error':     text.error,
    '--ax-text-success':   text.success,
    '--ax-text-caret':     text.caret,
    '--ax-text-gradient':  text.gradient,

    '--ax-border-primary': p.primaryLight
      ? `rgba(${hexOrRawToRgbStr(p.primaryLight)}, 0.35)`
      : undefined,
    '--ax-border-surface': mode === 'dark'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(0, 0, 0, 0.12)',
    '--ax-border-error': border.error,

    '--ax-color-primary-rgb': p.primaryLight
      ? hexOrRawToRgbStr(p.primaryLight)
      : undefined,
  };

  for (const [key, value] of Object.entries(vars)) {
    if (value != null) {
      root.style.setProperty(key, value);
    }
  }
}

/**
 * Attempt to extract an "r, g, b" triplet string from a hex colour so we can
 * compose `rgba(r, g, b, 0.35)` for derived border tokens.
 *
 * Supports 3-digit (#abc) and 6-digit (#aabbcc) hex strings only.
 * Falls back to returning the raw value unchanged for non-hex strings
 * (the caller must then avoid wrapping it in rgba()).
 */
function hexOrRawToRgbStr(color: string): string {
  const hex = color.trim();
  if (hex.startsWith('#')) {
    let r: number, g: number, b: number;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    } else {
      return hex;
    }
    return `${r}, ${g}, ${b}`;
  }
  // For rgba/rgb strings we just pass the whole thing — caller won't wrap in rgba()
  return hex;
}
