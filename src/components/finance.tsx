/** Finance-specific building blocks shared by several screens. */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dayLabel, monthLabel } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import type { AppData, Minor, Transaction, WalletType } from '@/domain/types';
import { useCurrency } from '@/store/data';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, IconButton, ListItem, Row, Text, type IconName } from './ui';

export const WALLET_TYPES: Record<WalletType, { label: string; icon: IconName }> = {
  cash: { label: 'Tiền mặt', icon: 'dollar-sign' },
  bank: { label: 'Ngân hàng', icon: 'credit-card' },
  ewallet: { label: 'Ví điện tử', icon: 'smartphone' },
  credit: { label: 'Thẻ tín dụng', icon: 'layers' },
};

/** Returns a formatter that honours the active currency and the "hide balances" toggle. */
export function useFormatMoney() {
  const currency = useCurrency();
  const hide = usePrefs((s) => s.hideBalances);
  return (amount: Minor, opts?: { signed?: boolean; compact?: boolean; sensitive?: boolean }) =>
    hide && opts?.sensitive !== false ? '••••••' : formatMoney(amount, currency, opts);
}

/** Money text that respects the "hide balances" privacy toggle and colours by sign. */
export function Money({
  amount,
  variant = 'bodyStrong',
  signed,
  colored,
  compact,
  sensitive = true,
}: {
  amount: Minor;
  variant?: 'bodyStrong' | 'subtitle' | 'title' | 'headline' | 'caption' | 'body';
  signed?: boolean;
  colored?: boolean;
  compact?: boolean;
  /** Hidden when the user toggles privacy mode. */
  sensitive?: boolean;
}) {
  const currency = useCurrency();
  const hide = usePrefs((s) => s.hideBalances) && sensitive;
  const tone = colored ? (amount > 0 ? 'success' : amount < 0 ? 'danger' : 'primary') : 'primary';
  return (
    <Text variant={variant} tone={tone} numberOfLines={1}>
      {hide ? '••••••' : formatMoney(amount, currency, { signed, compact })}
    </Text>
  );
}

/** Scrollable screen body with safe-area padding and room for the FAB. */
export function Screen({ children, ...rest }: ScrollViewProps & { children: ReactNode }) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 96 }}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

export function TransactionRow({ t, data }: { t: Transaction; data: AppData }) {
  const { colors } = useTheme();
  const currency = useCurrency();
  const cat = data.categories.find((c) => c.id === t.categoryId);
  const wallet = data.wallets.find((w) => w.id === t.walletId);
  const toWallet = data.wallets.find((w) => w.id === t.toWalletId);
  const hide = usePrefs((s) => s.hideBalances);

  const isTransfer = t.kind === 'transfer';
  const title = isTransfer ? 'Chuyển tiền' : (cat?.name ?? 'Không rõ');
  const subtitle = [isTransfer ? `${wallet?.name ?? '?'} → ${toWallet?.name ?? '?'}` : wallet?.name, t.note]
    .filter(Boolean)
    .join(' · ');
  const signed = t.kind === 'expense' ? -t.amount : t.amount;

  return (
    <ListItem
      icon={isTransfer ? 'repeat' : ((cat?.icon as IconName) ?? 'circle')}
      iconColor={isTransfer ? colors.primary : cat?.color}
      title={title}
      subtitle={subtitle}
      onPress={() => router.push({ pathname: '/transaction', params: { id: t.id } })}
      right={
        <Text variant="bodyStrong" tone={isTransfer ? 'primary' : signed > 0 ? 'success' : 'danger'}>
          {hide ? '••••' : formatMoney(signed, currency, { signed: !isTransfer })}
        </Text>
      }
    />
  );
}

/** Transactions grouped under "Hôm nay / Hôm qua / dd/mm/yyyy" headers. */
export function TransactionList({ items, data }: { items: Transaction[]; data: AppData }) {
  const { spacing } = useTheme();
  const groups = new Map<string, Transaction[]>();
  for (const t of [...items].sort((a, b) => b.occurredAt - a.occurredAt)) {
    const label = dayLabel(t.occurredAt);
    groups.set(label, [...(groups.get(label) ?? []), t]);
  }
  return (
    <View>
      {[...groups.entries()].map(([label, list]) => (
        <View key={label} style={{ marginTop: spacing.md }}>
          <Text variant="caption" tone="secondary" style={{ marginBottom: spacing.xs }}>
            {label}
          </Text>
          {list.map((t) => (
            <TransactionRow key={t.id} t={t} data={data} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function MonthSwitcher({
  value,
  onChange,
  max,
}: {
  value: string;
  onChange: (delta: number) => void;
  max: string;
}) {
  return (
    <Row justify="space-between">
      <IconButton icon="chevron-left" label="Tháng trước" onPress={() => onChange(-1)} />
      <Text variant="subtitle">{monthLabel(value)}</Text>
      <IconButton
        icon="chevron-right"
        label="Tháng sau"
        onPress={() => value < max && onChange(1)}
        color={value < max ? undefined : 'transparent'}
      />
    </Row>
  );
}

export function StatPill({
  label,
  amount,
  tone,
  icon,
}: {
  label: string;
  amount: Minor;
  tone: 'success' | 'danger';
  icon: IconName;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: tone === 'success' ? colors.successSoft : colors.dangerSoft,
        gap: spacing.xs,
      }}
    >
      <Row gap={spacing.xs}>
        <Icon name={icon} size={16} color={tone === 'success' ? colors.success : colors.danger} />
        <Text variant="caption" tone="secondary">
          {label}
        </Text>
      </Row>
      <Money amount={amount} compact />
    </View>
  );
}

/** Floating action button for the primary "add" action of a screen (56pt). */
export function Fab({ onPress, label, icon = 'plus' }: { onPress: () => void; label: string; icon?: IconName }) {
  const { colors, radius, elevation, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          position: 'absolute',
          right: spacing.lg,
          bottom: insets.bottom + spacing.lg,
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        },
        elevation.floating,
      ]}
    >
      <Icon name={icon} size={26} color={colors.onPrimary} />
    </Pressable>
  );
}
