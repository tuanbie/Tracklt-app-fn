import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Device-local preferences — deliberately NOT synced to Drive. */
export type ThemeMode = 'system' | 'light' | 'dark';

interface PrefsState {
  themeMode: ThemeMode;
  hideBalances: boolean;
  autoSync: boolean;
  setThemeMode: (m: ThemeMode) => void;
  toggleHideBalances: () => void;
  setAutoSync: (v: boolean) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      hideBalances: false,
      autoSync: true,
      setThemeMode: (themeMode) => set({ themeMode }),
      toggleHideBalances: () => set((s) => ({ hideBalances: !s.hideBalances })),
      setAutoSync: (autoSync) => set({ autoSync }),
    }),
    { name: 'trackit.prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
