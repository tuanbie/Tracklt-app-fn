/** The non-happy-path screen states: loading, empty, error. */
import { useEffect, useState } from 'react';
import { Animated, View, type DimensionValue } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Icon, Text, type IconName } from './ui';

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{ alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.sm }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.lg,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.sm,
        }}
      >
        <Icon name={icon} size={28} color={colors.primary} />
      </View>
      <Text variant="subtitle" align="center">
        {title}
      </Text>
      <Text tone="secondary" align="center">
        {message}
      </Text>
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          icon="plus"
          style={{ marginTop: spacing.md, alignSelf: 'stretch' }}
        />
      )}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md }}
    >
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <Icon name="alert-circle" color={colors.danger} />
        <Text style={{ flex: 1 }}>{message}</Text>
      </View>
      {onRetry && <Button title="Thử lại" icon="refresh-cw" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

/** Pulsing placeholder block for loading skeletons. */
export function Skeleton({
  height = 16,
  width = '100%',
  radiusKey = 'sm',
}: {
  height?: number;
  width?: DimensionValue;
  radiusKey?: 'sm' | 'md' | 'lg';
}) {
  const { colors, radius } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{ height, width, borderRadius: radius[radiusKey], backgroundColor: colors.surfaceRaised, opacity }}
    />
  );
}

export function LoadingScreen() {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.lg, paddingTop: 96 }}>
      <Skeleton height={140} radiusKey="lg" />
      <Skeleton height={20} width="40%" />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={56} />
      ))}
    </View>
  );
}
