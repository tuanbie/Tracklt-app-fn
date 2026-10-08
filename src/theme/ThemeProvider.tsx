import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { usePrefs } from '@/store/prefs';
import { darkColors, elevation, lightColors, radius, spacing, typography, type Colors } from './tokens';

export interface Theme {
  dark: boolean;
  colors: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  elevation: typeof elevation;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const mode = usePrefs((s) => s.themeMode);
  const dark = mode === 'system' ? system === 'dark' : mode === 'dark';

  const theme = useMemo<Theme>(
    () => ({ dark, colors: dark ? darkColors : lightColors, spacing, radius, typography, elevation }),
    [dark],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
