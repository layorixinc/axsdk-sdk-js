import type { AXTheme } from './theme';

/**
 * The built-in dark theme — all color tokens resolved to concrete values.
 * These are the colors currently hard-coded throughout the component library.
 */
export const AX_DEFAULT_DARK_THEME: AXTheme = {
  colorMode: 'dark',
  colors: {
    primary: {
      primary:      '#7c3aed',
      primaryDark:  '#1d4ed8',
      primaryLight: '#a855f7',
      primaryMuted: '#c084fc',
      accent1:      '#a855f7',
      accent2:      '#3b82f6',
      accent3:      '#06b6d4',
      accent4:      '#ec4899',
    },
    bg: {
      dark: {
        base:             'rgba(12, 12, 18, 0.97)',
        popover:          'rgba(18, 18, 28, 0.92)',
        userMessage:      'linear-gradient(135deg, rgba(124,58,237,1) 0%, rgba(79,70,229,1) 100%)',
        assistantMessage: 'rgba(255, 255, 255, 1.0)',
        questionDialog:   'linear-gradient(160deg, rgba(20,15,45,0.97) 0%, rgba(10,8,30,0.98) 100%)',
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
      caret:     '#a78bfa',
      gradient:  'linear-gradient(90deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)',
    },
    border: {
      error: 'rgba(248, 113, 113, 0.25)',
    },
  },
  styles: {},
};

/**
 * The built-in light theme — suitable for host pages with light/white backgrounds.
 */
export const AX_DEFAULT_LIGHT_THEME: AXTheme = {
  colorMode: 'light',
  colors: {
    primary: {
      primary:      '#7c3aed',
      primaryDark:  '#4f46e5',
      primaryLight: '#a855f7',
      primaryMuted: '#c084fc',
      accent1:      '#9333ea',
      accent2:      '#2563eb',
      accent3:      '#0891b2',
      accent4:      '#db2777',
    },
    bg: {
      light: {
        base:             'rgba(255, 255, 255, 0.97)',
        popover:          'rgba(248, 248, 252, 0.97)',
        userMessage:      'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        assistantMessage: 'rgba(245, 245, 250, 1.0)',
        questionDialog:   'rgba(255, 255, 255, 0.98)',
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
      caret:     '#7c3aed',
      gradient:  'linear-gradient(90deg, #7c3aed 0%, #4f46e5 50%, #06b6d4 100%)',
    },
    border: {
      error: 'rgba(248, 113, 113, 0.35)',
    },
  },
  styles: {},
};

/**
 * Returns a fully-resolved theme by merging `userTheme` on top of the
 * appropriate default (dark or light) theme.
 *
 * @param userTheme  Optional partial theme supplied by the consumer.
 * @returns A merged `AXTheme` object ready to be used by the provider.
 */
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
