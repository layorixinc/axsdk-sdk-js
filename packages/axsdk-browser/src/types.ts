/**
 * Local AXTheme type definition for axsdk-browser.
 *
 * This mirrors the AXTheme interface from @axsdk/react/src/theme.ts.
 * It is duplicated here to avoid workspace type-resolution issues when the
 * @axsdk/react package has not been built yet (i.e. dist/lib.d.ts missing).
 *
 * Keep in sync with packages/axsdk-react/src/theme.ts.
 */

export interface AXTheme {
  /**
   * URL of the image to render as the default (idle) button icon.
   * When provided, replaces the layered orb gradient with an <img> element.
   */
  buttonImageUrl?: string;

  /**
   * URL of the image (or GIF) to render when the assistant is busy.
   * Falls back to buttonImageUrl if not provided.
   */
  buttonAnimationImageUrl?: string;

  /**
   * Color mode. Defaults to 'dark'.
   * - 'dark': The current default dark UI.
   * - 'light': Inverted palette suitable for light-background host pages.
   */
  colorMode?: 'dark' | 'light';

  /**
   * Color token overrides. Merged on top of the built-in dark/light palette.
   * Only specify what you want to change.
   */
  colors?: {
    primary?: {
      primary?: string;
      primaryDark?: string;
      primaryLight?: string;
      primaryMuted?: string;
    };
    bg?: {
      dark?: {
        base?: string;
        popover?: string;
        userMessage?: string;
        assistantMessage?: string;
        questionDialog?: string;
        inputTextarea?: string;
        overlay?: string;
      };
      light?: {
        base?: string;
        popover?: string;
        userMessage?: string;
        assistantMessage?: string;
        questionDialog?: string;
        inputTextarea?: string;
        overlay?: string;
      };
    };
    text?: {
      primary?: string;
      muted?: string;
      dim?: string;
      assistant?: string;
      timestamp?: string;
      error?: string;
      success?: string;
      caret?: string;
      gradient?: string;
    };
  };

  /**
   * Per-component style overrides using React.CSSProperties (plain objects).
   * Merged with the component's own default inline styles; user overrides win.
   */
  styles?: {
    button?: {
      wrapper?: Record<string, unknown>;
      button?: Record<string, unknown>;
      orb?: Record<string, unknown>;
      label?: Record<string, unknown>;
    };
    input?: {
      card?: Record<string, unknown>;
      textarea?: Record<string, unknown>;
      sendButton?: Record<string, unknown>;
      clearButton?: Record<string, unknown>;
      guideText?: Record<string, unknown>;
    };
    popover?: {
      wrapper?: Record<string, unknown>;
      card?: Record<string, unknown>;
      content?: Record<string, unknown>;
      closeButton?: Record<string, unknown>;
    };
    message?: {
      row?: Record<string, unknown>;
      userBubble?: Record<string, unknown>;
      assistantBubble?: Record<string, unknown>;
      timestamp?: Record<string, unknown>;
    };
    questionDialog?: {
      card?: Record<string, unknown>;
      optionSelected?: Record<string, unknown>;
      optionUnselected?: Record<string, unknown>;
      submitButton?: Record<string, unknown>;
      declineButton?: Record<string, unknown>;
    };
  };
}
