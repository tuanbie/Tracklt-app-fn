import type { TextStyle } from 'react-native';

/** 4-pt spacing grid. Never use values outside this scale. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

export const typography = {
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  headline: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export interface Colors {
  background: string;
  surface: string;
  /** Raised surface (inputs, chips, nested cards) — lighter than `surface` in dark mode. */
  surfaceRaised: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  success: string;
  danger: string;
  warning: string;
  dangerSoft: string;
  successSoft: string;
  overlay: string;
}

// Contrast checked: textSecondary on surface ≥ 4.5:1, primary vs onPrimary ≥ 4.5:1 in both themes.
export const lightColors: Colors = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceRaised: '#EEF1F4',
  textPrimary: '#111827',
  textSecondary: '#566070',
  border: '#E1E5EA',
  primary: '#0E7C66',
  onPrimary: '#FFFFFF',
  primarySoft: '#DDF2EC',
  success: '#15803D',
  danger: '#C62828',
  warning: '#B45309',
  dangerSoft: '#FDE8E8',
  successSoft: '#E3F5E8',
  overlay: 'rgba(17,24,39,0.45)',
};

export const darkColors: Colors = {
  background: '#0D1015',
  surface: '#171B22',
  surfaceRaised: '#212732',
  textPrimary: '#F3F4F6',
  textSecondary: '#A6AEBB',
  border: '#2B323D',
  primary: '#3DD6B3',
  onPrimary: '#05271F',
  primarySoft: '#123A31',
  success: '#4ADE80',
  danger: '#F87171',
  warning: '#FBBF24',
  dangerSoft: '#3A1A1C',
  successSoft: '#13321F',
  overlay: 'rgba(0,0,0,0.6)',
};

/** `boxShadow` is cross-platform (iOS, Android new arch, web) since RN 0.76. */
export const elevation = {
  card: { boxShadow: '0px 4px 12px rgba(11, 18, 32, 0.06)' },
  floating: { boxShadow: '0px 8px 16px rgba(11, 18, 32, 0.22)' },
} as const;

/** Minimum touch target (pt). */
export const TOUCH = 44;
