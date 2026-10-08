import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Tổng quan', icon: 'home' },
  { name: 'wallets', title: 'Ví', icon: 'credit-card' },
  { name: 'savings', title: 'Tiết kiệm', icon: 'target' },
  { name: 'stats', title: 'Thống kê', icon: 'pie-chart' },
];

export default function TabLayout() {
  const { colors, typography, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingTop: spacing.xs,
          paddingBottom: insets.bottom + spacing.xs,
        },
        tabBarLabelStyle: { fontSize: typography.caption.fontSize, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: typography.title.fontSize, fontWeight: typography.title.fontWeight },
        headerTitleAlign: 'left',
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.name === 'index' ? 'TrackIt' : t.title,
            tabBarLabel: t.title,
            tabBarIcon: ({ color, size }) => <Feather name={t.icon} size={size - 2} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
