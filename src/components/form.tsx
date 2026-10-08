import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View, type TextInputProps } from 'react-native';

import { formatAmountInput } from '@/domain/money';
import type { CurrencyCode } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, Text, type IconName } from './ui';

/** Label is always visible (never placeholder-only); error shows only after blur/submit. */
export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      {children}
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="secondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function TextField({ invalid, style, ...props }: TextInputProps & { invalid?: boolean }) {
  const { colors, radius, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[
        typography.body,
        {
          minHeight: 48,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceRaised,
          color: colors.textPrimary,
          borderWidth: 1.5,
          borderColor: invalid ? colors.danger : focused ? colors.primary : 'transparent',
        },
        // Our own focus border replaces the browser outline on web.
        Platform.OS === 'web' && { outlineWidth: 0 },
        style,
      ]}
    />
  );
}

/** Large amount input with live digit grouping and numeric keyboard. */
export function AmountField({
  value,
  onChange,
  currency,
  invalid,
  tone,
  autoFocus,
  onBlur,
}: {
  value: string;
  onChange: (v: string) => void;
  currency: CurrencyCode;
  invalid?: boolean;
  tone?: 'danger' | 'success' | 'primary';
  autoFocus?: boolean;
  onBlur?: () => void;
}) {
  const { colors, typography } = useTheme();
  const color = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.textPrimary;
  return (
    <TextField
      value={value}
      onChangeText={(t) => onChange(formatAmountInput(t, currency))}
      keyboardType={currency === 'VND' ? 'number-pad' : 'decimal-pad'}
      placeholder="0"
      autoFocus={autoFocus}
      invalid={invalid}
      onBlur={onBlur}
      accessibilityLabel={`Số tiền (${currency})`}
      style={[typography.headline, { color, minHeight: 64 }]}
    />
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceRaised,
        borderRadius: radius.md,
        padding: spacing.xs,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              backgroundColor: active ? colors.surface : 'transparent',
            }}
          >
            <Text variant="bodyStrong" tone={active ? 'primary' : 'secondary'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface ChipOption {
  id: string;
  label: string;
  icon?: IconName;
  color?: string;
}

/** Horizontally scrolling single-select chips (wallet / category pickers). */
export function ChipPicker({
  options,
  value,
  onChange,
  invalid,
}: {
  options: ChipOption[];
  value: string | undefined;
  onChange: (id: string) => void;
  invalid?: boolean;
}) {
  const { colors, radius, spacing } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}
    >
      {options.map((o) => {
        const active = o.id === value;
        const accent = o.color ?? colors.primary;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              minHeight: 44,
              paddingHorizontal: spacing.md,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: active ? accent : invalid ? colors.danger : colors.border,
              backgroundColor: active ? `${accent}1F` : colors.surface,
            }}
          >
            {o.icon && <Icon name={o.icon} size={16} color={accent} />}
            <Text variant="bodyStrong">{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SwatchPicker({
  colors: swatches,
  value,
  onChange,
}: {
  colors: string[];
  value: string;
  onChange: (c: string) => void;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {swatches.map((c) => (
        <Pressable
          key={c}
          onPress={() => onChange(c)}
          accessibilityRole="radio"
          accessibilityLabel={`Màu ${c}`}
          accessibilityState={{ selected: c === value }}
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.pill,
            backgroundColor: c,
            borderWidth: 3,
            borderColor: c === value ? colors.textPrimary : 'transparent',
          }}
        />
      ))}
    </View>
  );
}

const isFuture = (ts: number) => ts > Date.now() + 86_400_000;

/** Quick date choice without a native date-picker dependency. */
export function DateQuickPicker({ value, onChange }: { value: number; onChange: (ts: number) => void }) {
  const { spacing } = useTheme();
  const d = new Date(value);
  const shift = (days: number) => {
    const next = new Date(d);
    next.setDate(d.getDate() + days);
    if (!isFuture(next.getTime())) onChange(next.getTime());
  };
  const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <ChevronButton icon="chevron-left" label="Ngày trước" onPress={() => shift(-1)} />
      <TextField editable={false} value={label} style={{ flex: 1, textAlign: 'center' }} />
      <ChevronButton icon="chevron-right" label="Ngày sau" onPress={() => shift(1)} />
    </View>
  );
}

function ChevronButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 48,
        height: 48,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceRaised,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} />
    </Pressable>
  );
}
