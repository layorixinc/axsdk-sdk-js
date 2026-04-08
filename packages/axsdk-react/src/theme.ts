import type React from 'react';

export interface AXThemeColorsPrimary {
  primary?: string;
  primaryDark?: string;
  primaryLight?: string;
  primaryMuted?: string;
  accent1?: string;
  accent2?: string;
  accent3?: string;
  accent4?: string;
}

export interface AXThemeColorsBgDark {
  base?: string;
  popover?: string;
  userMessage?: string;
  assistantMessage?: string;
  questionDialog?: string;
  inputTextarea?: string;
  overlay?: string;
  error?: string;
}

export interface AXThemeColorsBgLight {
  base?: string;
  popover?: string;
  userMessage?: string;
  assistantMessage?: string;
  questionDialog?: string;
  inputTextarea?: string;
  overlay?: string;
  error?: string;
}

export interface AXThemeColorsBg {
  dark?: AXThemeColorsBgDark;
  light?: AXThemeColorsBgLight;
}

export interface AXThemeColorsText {
  primary?: string;
  muted?: string;
  dim?: string;
  assistant?: string;
  timestamp?: string;
  error?: string;
  success?: string;
  caret?: string;
  gradient?: string;
}

export interface AXThemeBorderTokens {
  error?: string;
}

export interface AXThemeColors {
  primary?: AXThemeColorsPrimary;
  bg?: AXThemeColorsBg;
  text?: AXThemeColorsText;
  border?: AXThemeBorderTokens;
}

export interface AXThemeButtonStyles {
  wrapper?: React.CSSProperties;
  button?: React.CSSProperties;
  orb?: React.CSSProperties;
  label?: React.CSSProperties;
}

export interface AXThemeInputStyles {
  card?: React.CSSProperties;
  textarea?: React.CSSProperties;
  sendButton?: React.CSSProperties;
  clearButton?: React.CSSProperties;
  guideText?: React.CSSProperties;
}

export interface AXThemePopoverStyles {
  wrapper?: React.CSSProperties;
  card?: React.CSSProperties;
  content?: React.CSSProperties;
  closeButton?: React.CSSProperties;
}

export interface AXThemeMessageStyles {
  row?: React.CSSProperties;
  userBubble?: React.CSSProperties;
  assistantBubble?: React.CSSProperties;
  timestamp?: React.CSSProperties;
}

export interface AXThemeQuestionDialogStyles {
  card?: React.CSSProperties;
  optionSelected?: React.CSSProperties;
  optionUnselected?: React.CSSProperties;
  submitButton?: React.CSSProperties;
  declineButton?: React.CSSProperties;
}

export interface AXThemeStyles {
  button?: AXThemeButtonStyles;
  input?: AXThemeInputStyles;
  popover?: AXThemePopoverStyles;
  message?: AXThemeMessageStyles;
  questionDialog?: AXThemeQuestionDialogStyles;
}

export interface AXTheme {
  buttonImageUrl?: string;

  buttonAnimationImageUrl?: string;

  colorMode?: 'dark' | 'light';

  colors?: AXThemeColors;

  styles?: AXThemeStyles;
}

export interface AXThemeContextValue {
  theme: AXTheme;
  resolvedColorMode: 'dark' | 'light';
}
