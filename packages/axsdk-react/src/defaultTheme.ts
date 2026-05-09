import type { AXTheme } from './theme';

export const AX_DEFAULT_DARK_THEME: AXTheme = {
  colorMode: 'dark',
  colors: {
    primary: {
      primary:      '#00b8db',
      primaryDark:  '#005f73',
      primaryLight: '#00d4ff',
      primaryMuted: '#7ddff0',
      accent1:      '#00d4ff',
      accent2:      '#38bdf8',
      accent3:      '#22e6c7',
      accent4:      '#0ea5e9',
    },
    bg: {
      dark: {
        base:             'rgba(12, 12, 18, 0.97)',
        popover:          'rgba(18, 18, 28, 0.92)',
        userMessage:      'linear-gradient(135deg, rgba(0,95,115,1) 0%, rgba(0,184,219,1) 100%)',
        assistantMessage: 'rgba(255, 255, 255, 1.0)',
        questionDialog:   'linear-gradient(160deg, rgba(0,95,115,0.97) 0%, rgba(3,37,48,0.98) 100%)',
        inputTextarea:    'rgba(255, 255, 255, 0.07)',
        overlay:          'rgba(0, 0, 0, 0.5)',
        error:            'rgba(248, 113, 113, 0.08)',
      },
    },
    text: {
      primary:   'rgba(255, 255, 255, 0.92)',
      muted:     'rgba(255, 255, 255, 0.75)',
      dim:       'rgba(255, 255, 255, 0.45)',
      assistant: 'rgba(33, 33, 33, 0.92)',
      timestamp: 'rgba(255, 255, 255, 0.28)',
      error:     '#f87171',
      success:   'rgba(52, 211, 153, 0.9)',
      caret:     '#00d4ff',
      gradient:  'linear-gradient(90deg, #7ddff0 0%, #00d4ff 50%, #38bdf8 100%)',
    },
    border: {
      error: 'rgba(248, 113, 113, 0.25)',
    },
  },
  styles: {},
};

export const AX_DEFAULT_LIGHT_THEME: AXTheme = {
  colorMode: 'light',
  colors: {
    primary: {
      primary:      '#00b8db',
      primaryDark:  '#064e5f',
      primaryLight: '#00d4ff',
      primaryMuted: '#7ddff0',
      accent1:      '#00b8db',
      accent2:      '#0ea5e9',
      accent3:      '#22e6c7',
      accent4:      '#38bdf8',
    },
    bg: {
      light: {
        base:             'rgba(255, 255, 255, 0.97)',
        popover:          'rgba(248, 248, 252, 0.97)',
        userMessage:      'linear-gradient(135deg, #005f73 0%, #00b8db 100%)',
        assistantMessage: 'rgba(245, 245, 250, 1.0)',
        questionDialog:   'rgba(236, 253, 255, 0.98)',
        inputTextarea:    'rgba(0, 0, 0, 0.04)',
        overlay:          'rgba(0, 0, 0, 0.35)',
        error:            'rgba(248, 113, 113, 0.06)',
      },
    },
    text: {
      primary:   'rgba(20, 20, 40, 0.92)',
      muted:     'rgba(20, 20, 40, 0.60)',
      dim:       'rgba(20, 20, 40, 0.35)',
      assistant: 'rgba(20, 20, 40, 0.92)',
      timestamp: 'rgba(20, 20, 40, 0.30)',
      error:     '#dc2626',
      success:   'rgba(5, 150, 105, 0.9)',
      caret:     '#00b8db',
      gradient:  'linear-gradient(90deg, #005f73 0%, #00b8db 50%, #0ea5e9 100%)',
    },
    border: {
      error: 'rgba(248, 113, 113, 0.35)',
    },
  },
  styles: {},
};

export function mergeTheme(userTheme?: AXTheme): AXTheme {
  const base =
    userTheme?.colorMode === 'light' ? AX_DEFAULT_LIGHT_THEME : AX_DEFAULT_DARK_THEME;

  if (!userTheme) return base;

  return {
    ...base,
    ...userTheme,
    colors: {
      primary: { ...base.colors?.primary, ...userTheme.colors?.primary },
      bg: {
        dark:  { ...base.colors?.bg?.dark,  ...userTheme.colors?.bg?.dark  },
        light: { ...base.colors?.bg?.light, ...userTheme.colors?.bg?.light },
      },
      text: { ...base.colors?.text, ...userTheme.colors?.text },
      border: { ...base.colors?.border, ...userTheme.colors?.border },
    },
    styles: {
      button:         { ...base.styles?.button,         ...userTheme.styles?.button         },
      input:          { ...base.styles?.input,          ...userTheme.styles?.input          },
      popover:        { ...base.styles?.popover,        ...userTheme.styles?.popover        },
      message:        { ...base.styles?.message,        ...userTheme.styles?.message        },
      questionDialog: { ...base.styles?.questionDialog, ...userTheme.styles?.questionDialog },
    },
  };
}
