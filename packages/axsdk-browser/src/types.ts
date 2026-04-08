export interface AXTheme {
  buttonImageUrl?: string;

  buttonAnimationImageUrl?: string;

  colorMode?: 'dark' | 'light';

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
