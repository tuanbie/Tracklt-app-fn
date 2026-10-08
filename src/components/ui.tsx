/**
 * Base design-system primitives. Screens compose these instead of styling raw
 * RN components, so colours/spacing always come from theme tokens.
 */
import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text as RNText,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { TOUCH, type Colors, type TypographyVariant } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Feather>['name'];

type TextTone = 'primary' | 'secondary' | 'success' | 'danger' | 'brand' | 'onPrimary' | 'warning';

const toneColor = (c: Colors, tone: TextTone) =>
  ({
    primary: c.textPrimary,
    secondary: c.textSecondary,
    success: c.success,
    danger: c.danger,
    brand: c.primary,
    onPrimary: c.onPrimary,
    warning: c.warning,
  })[tone];

export function Text({
  variant = 'body',
  tone = 'primary',
  align,
  style,
  ...rest
}: RNTextProps & { variant?: TypographyVariant; tone?: TextTone; align?: TextStyle['textAlign'] }) {
  const { typography, colors } = useTheme();
  return (
    <RNText
      {...rest}
      style={[typography[variant], { color: toneColor(colors, tone), textAlign: align }, style]}
      maxFontSizeMultiplier={1.6}
    />
  );
}

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <Feather name={name} size={size} color={color ?? colors.textPrimary} />;
}

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const { colors, radius, spacing, elevation, dark } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.surface, borderRadius: radius.md, padding: padded ? spacing.lg : 0 },
        dark ? { borderWidth: 1, borderColor: colors.border } : elevation.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radius, spacing, typography } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.surfaceRaised, fg: colors.textPrimary },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    ghost: { bg: 'transparent', fg: colors.primary },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        {
          minHeight: 48,
          borderRadius: radius.md,
          backgroundColor: palette.bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && <Feather name={icon} size={18} color={palette.fg} />}
          <RNText style={[typography.bodyStrong, { color: palette.fg }]}>{title}</RNText>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color,
  filled,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  filled?: boolean;
}) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: TOUCH,
        height: TOUCH,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? colors.surfaceRaised : 'transparent',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Feather name={icon} size={22} color={color ?? colors.textPrimary} />
    </Pressable>
  );
}

/** Coloured rounded square holding an icon — used for categories, wallets, goals. */
export function IconBadge({ icon, color, size = 40 }: { icon: IconName; color: string; size?: number }) {
  const { radius } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: `${color}26`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Feather name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

export function Row({
  children,
  gap,
  style,
  justify,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  justify?: ViewStyle['justifyContent'];
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap, justifyContent: justify }, style]}>
      {children}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { spacing } = useTheme();
  return (
    <Row justify="space-between" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
      <Text variant="subtitle">{title}</Text>
      {action && onAction && (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <Text variant="bodyStrong" tone="brand">
            {action}
          </Text>
        </Pressable>
      )}
    </Row>
  );
}

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const { colors, radius } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' }}
    >
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: color ?? colors.primary,
        }}
      />
    </View>
  );
}

export function ListItem({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  onLongPress,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: PressableProps['onPress'];
  onLongPress?: PressableProps['onLongPress'];
}) {
  const { spacing, colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 56,
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {icon && <IconBadge icon={icon} color={iconColor ?? colors.primary} />}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}
