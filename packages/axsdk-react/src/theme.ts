import type React from 'react';

/**
 * Brand / primary color palette tokens.
 * All values are any valid CSS color string (hex, rgb, hsl, etc.).
 */
export interface AXThemeColorsPrimary {
  /** Main brand purple. Default: "#7c3aed" */
  primary?: string;
  /** Secondary gradient partner. Default: "#4f46e5" */
  primaryDark?: string;
  /** Lighter accent for borders, rings, focus states. Default: "#a855f7" */
  primaryLight?: string;
  /** Muted brand color for gradient text. Default: "#c084fc" */
  primaryMuted?: string;
  /** Ring gradient accent 1 (violet). Default dark: "#a855f7", light: "#9333ea" */
  accent1?: string;
  /** Ring gradient accent 2 (blue). Default dark: "#3b82f6", light: "#2563eb" */
  accent2?: string;
  /** Ring gradient accent 3 (cyan). Default dark: "#06b6d4", light: "#0891b2" */
  accent3?: string;
  /** Ring gradient accent 4 (pink). Default dark: "#ec4899", light: "#db2777" */
  accent4?: string;
}

/**
 * Semantic background token set for the dark color mode.
 */
export interface AXThemeColorsBgDark {
  /** Base panel background (e.g. message input card). Default: "rgba(12,12,18,0.97)" */
  base?: string;
  /** Popover / speech bubble background. Default: "rgba(18,18,28,0.92)" */
  popover?: string;
  /** User message bubble background (can be a gradient). Default: "linear-gradient(135deg, rgba(124,58,237,1) 0%, rgba(79,70,229,1) 100%)" */
  userMessage?: string;
  /** Assistant message bubble background. Default: "rgba(255,255,255,1.0)" */
  assistantMessage?: string;
  /** Question dialog card background. Default: "linear-gradient(160deg, rgba(20,15,45,0.97) 0%, rgba(10,8,30,0.98) 100%)" */
  questionDialog?: string;
  /** Input textarea background. Default: "rgba(255,255,255,0.07)" */
  inputTextarea?: string;
  /** Full-screen overlay backdrop. Default: "rgba(0,0,0,0.5)" */
  overlay?: string;
  /** Error state background. Default: "rgba(248,113,113,0.08)" */
  error?: string;
}

/**
 * Semantic background token set for the light color mode.
 * All tokens have sensible light defaults and only need to be specified if
 * the built-in light theme values need to be overridden.
 */
export interface AXThemeColorsBgLight {
  base?: string;             // Default: "rgba(255,255,255,0.97)"
  popover?: string;          // Default: "rgba(248,248,252,0.97)"
  userMessage?: string;      // Default: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)"
  assistantMessage?: string; // Default: "rgba(245,245,250,1.0)"
  questionDialog?: string;   // Default: "rgba(255,255,255,0.98)"
  inputTextarea?: string;    // Default: "rgba(0,0,0,0.04)"
  overlay?: string;          // Default: "rgba(0,0,0,0.35)"
  error?: string;            // Default: "rgba(248,113,113,0.06)"
}

/**
 * Per-mode background sets. When colorMode is "dark", the dark set is used; when "light", the light set.
 */
export interface AXThemeColorsBg {
  dark?: AXThemeColorsBgDark;
  light?: AXThemeColorsBgLight;
}

/**
 * Text color token set.
 */
export interface AXThemeColorsText {
  /** Main readable text. Default (dark): "rgba(255,255,255,0.92)" */
  primary?: string;
  /** Secondary / muted text. Default (dark): "rgba(255,255,255,0.75)" */
  muted?: string;
  /** Dimmed decorative text. Default (dark): "rgba(255,255,255,0.45)" */
  dim?: string;
  /** Text inside assistant message bubbles. Default (dark): "rgba(33,33,33,0.92)" */
  assistant?: string;
  /** Timestamp labels. Default (dark): "rgba(255,255,255,0.28)" */
  timestamp?: string;
  /** Error message color. Default: "#f87171" */
  error?: string;
  /** Success confirmation color. Default: "rgba(52,211,153,0.9)" */
  success?: string;
  /** Textarea caret color. Default: "#a78bfa" */
  caret?: string;
  /** Gradient applied to speech bubble text (CSS gradient string). Default: "linear-gradient(90deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)" */
  gradient?: string;
}

/**
 * All color tokens grouped for convenience.
 */
export interface AXThemeBorderTokens {
  /** Error state border color. Default dark: "rgba(248,113,113,0.25)", light: "rgba(248,113,113,0.35)" */
  error?: string;
}

export interface AXThemeColors {
  primary?: AXThemeColorsPrimary;
  bg?: AXThemeColorsBg;
  text?: AXThemeColorsText;
  /** Border color tokens (semantic). */
  border?: AXThemeBorderTokens;
}

/**
 * Partial `React.CSSProperties` overrides for `AXButton`.
 * Applied to the button's outermost wrapper div.
 */
export interface AXThemeButtonStyles {
  /** Outer wrapper div (position: fixed container). */
  wrapper?: React.CSSProperties;
  /** The `<button>` element itself. */
  button?: React.CSSProperties;
  /** The orb/main body layer. */
  orb?: React.CSSProperties;
  /** The "AX" label span (or replaced by image when buttonImageUrl is set). */
  label?: React.CSSProperties;
}

/**
 * Partial style overrides for `AXChatMessageInput`.
 */
export interface AXThemeInputStyles {
  /** The outer card container div. */
  card?: React.CSSProperties;
  /** The `<textarea>` element. */
  textarea?: React.CSSProperties;
  /** The Send `<button>`. */
  sendButton?: React.CSSProperties;
  /** The Clear `<button>`. */
  clearButton?: React.CSSProperties;
  /** The guide text div. */
  guideText?: React.CSSProperties;
}

/**
 * Partial style overrides for the notification/last-message popover
 * (`AXChatMessagePopoverBase`, shared by `AXChatNotificationPopover` and `AXChatLastMessage`).
 */
export interface AXThemePopoverStyles {
  /** Outer positioning wrapper. */
  wrapper?: React.CSSProperties;
  /** Inner card with backdrop-filter. */
  card?: React.CSSProperties;
  /** Scrollable content area. */
  content?: React.CSSProperties;
  /** Close button. */
  closeButton?: React.CSSProperties;
}

/**
 * Partial style overrides for individual chat message bubbles (`AXChatMessage`).
 */
export interface AXThemeMessageStyles {
  /** Outer row div. */
  row?: React.CSSProperties;
  /** User message bubble div. */
  userBubble?: React.CSSProperties;
  /** Assistant message bubble div. */
  assistantBubble?: React.CSSProperties;
  /** Timestamp div. */
  timestamp?: React.CSSProperties;
}

/**
 * Partial style overrides for `AXQuestionDialog`.
 */
export interface AXThemeQuestionDialogStyles {
  /** Outer dialog card div. */
  card?: React.CSSProperties;
  /** Selected option card button. */
  optionSelected?: React.CSSProperties;
  /** Unselected option card button. */
  optionUnselected?: React.CSSProperties;
  /** Submit/Next button (active state). */
  submitButton?: React.CSSProperties;
  /** Decline button. */
  declineButton?: React.CSSProperties;
}

/**
 * Grouped per-component style overrides. Each key is optional.
 * Styles are merged (Object.assign) with the component's own default inline styles,
 * with user-supplied values taking precedence.
 */
export interface AXThemeStyles {
  button?: AXThemeButtonStyles;
  input?: AXThemeInputStyles;
  popover?: AXThemePopoverStyles;
  message?: AXThemeMessageStyles;
  questionDialog?: AXThemeQuestionDialogStyles;
}

/**
 * Top-level theme interface passed to the `<AXUI theme={...} />` prop.
 *
 * All properties are optional. Unspecified values fall back to the built-in
 * defaults for the active `colorMode`.
 *
 * @example
 * ```tsx
 * const myTheme: AXTheme = {
 *   colorMode: 'light',
 *   buttonImageUrl: 'https://example.com/bot-icon.png',
 *   buttonAnimationImageUrl: 'https://example.com/bot-spinning.gif',
 *   colors: {
 *     primary: { primary: '#e11d48', primaryDark: '#be123c' },
 *   },
 * };
 *
 * <AXUI theme={myTheme} />
 * ```
 */
export interface AXTheme {
  /**
   * URL of the image to render as the default (idle) button icon.
   * When provided, replaces the layered orb gradient with an `<img>` element.
   * Recommended size: at least 2× the button `size` prop for retina displays.
   */
  buttonImageUrl?: string;

  /**
   * URL of the image (or GIF) to render when `status === "busy"`.
   * When provided, replaces the built-in vortex overlay with this image.
   * Falls back to `buttonImageUrl` if not provided.
   */
  buttonAnimationImageUrl?: string;

  /**
   * Color mode. Defaults to `'dark'`.
   * - `'dark'`: The current default dark UI.
   * - `'light'`: Inverted palette suitable for light-background host pages.
   *
   * CSS variables are injected on the AXUI portal root element so that
   * all components can consume them via `var(--ax-bg-base)` etc.
   */
  colorMode?: 'dark' | 'light';

  /**
   * Color token overrides. Merged on top of the built-in dark/light palette.
   * Only specify what you want to change.
   */
  colors?: AXThemeColors;

  /**
   * Per-component style overrides using `React.CSSProperties`.
   * Merged with the component's own default inline styles, user overrides win.
   */
  styles?: AXThemeStyles;
}

/**
 * The value shape stored in the React context created by `AXThemeProvider`.
 * Internal use only; not exported from the public package surface.
 */
export interface AXThemeContextValue {
  theme: AXTheme;
  resolvedColorMode: 'dark' | 'light';
}
