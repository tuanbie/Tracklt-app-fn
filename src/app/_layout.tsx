import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/states';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useData } from '@/store/data';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

function RootStack() {
  const { colors, dark, typography } = useTheme();
  const hydrated = useData((s) => s.hydrated);
  useAutoSync();

  if (!hydrated) return <LoadingScreen />;

  const modal = { presentation: 'modal' as const };
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontSize: typography.subtitle.fontSize, fontWeight: typography.subtitle.fontWeight },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="transaction" options={{ ...modal, title: 'Giao dịch' }} />
        <Stack.Screen name="transactions" options={{ title: 'Lịch sử giao dịch' }} />
        <Stack.Screen name="wallet/[id]" options={{ title: 'Chi tiết ví' }} />
        <Stack.Screen name="wallet/edit" options={{ ...modal, title: 'Ví' }} />
        <Stack.Screen name="goal/[id]" options={{ title: 'Mục tiêu' }} />
        <Stack.Screen name="goal/edit" options={{ ...modal, title: 'Mục tiêu tiết kiệm' }} />
        <Stack.Screen name="goal/move" options={{ ...modal, title: 'Nạp / Rút tiết kiệm' }} />
        <Stack.Screen name="budget/edit" options={{ ...modal, title: 'Ngân sách' }} />
        <Stack.Screen name="settings" options={{ title: 'Cài đặt' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
