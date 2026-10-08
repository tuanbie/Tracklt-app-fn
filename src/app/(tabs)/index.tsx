import { router, Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Fab, Screen, StatPill, TransactionList, useFormatMoney } from '@/components/finance';
import { EmptyState, ErrorState } from '@/components/states';
import { Card, IconButton, ProgressBar, Row, SectionHeader, Text } from '@/components/ui';
import { monthKey, monthLabel } from '@/domain/dates';
import { alive, budgetUsage, monthSummary, projectedMonthExpense, totalBalance, totalSaved } from '@/domain/finance';
import { syncNow, useSync } from '@/services/sync';
import { useData } from '@/store/data';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme/ThemeProvider';
import { useNow } from '@/hooks/useNow';

export default function Dashboard() {
  const { colors, spacing, radius } = useTheme();
  const data = useData((s) => s.data);
  const hide = usePrefs((s) => s.hideBalances);
  const toggleHide = usePrefs((s) => s.toggleHideBalances);
  const { status, error, account } = useSync();
  const fmt = useFormatMoney();

  const now = useNow();
  const key = monthKey(now);
  const view = useMemo(() => {
    const transactions = alive(data.transactions);
    return {
      balance: totalBalance(data),
      saved: totalSaved(data),
      month: monthSummary(data, key),
      projected: projectedMonthExpense(data, now),
      overBudget: budgetUsage(data, key).filter((b) => b.ratio >= 0.8),
      recent: [...transactions].sort((a, b) => b.occurredAt - a.occurredAt).slice(0, 6),
      hasAny: transactions.length > 0,
    };
  }, [data, key, now]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs.Screen
        options={{
          headerRight: () => (
            <Row style={{ marginRight: spacing.sm }}>
              <IconButton icon={hide ? 'eye-off' : 'eye'} label="Ẩn/hiện số dư" onPress={toggleHide} />
              <IconButton icon="settings" label="Cài đặt" onPress={() => router.push('/settings')} />
            </Row>
          ),
        }}
      />
      <Screen>
        {/* Hero balance card */}
        <View
          style={{ backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.xs }}
        >
          <Text variant="caption" tone="onPrimary" style={{ opacity: 0.85 }}>
            Tổng số dư khả dụng
          </Text>
          <Text variant="headline" tone="onPrimary" numberOfLines={1} adjustsFontSizeToFit>
            {fmt(view.balance)}
          </Text>
          <Row justify="space-between" style={{ marginTop: spacing.sm }}>
            <Text variant="caption" tone="onPrimary" style={{ opacity: 0.85 }}>
              Đang tiết kiệm: {fmt(view.saved)}
            </Text>
            {account && (
              <Pressable
                onPress={() => syncNow()}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Đồng bộ ngay"
              >
                <Text variant="caption" tone="onPrimary">
                  {status === 'syncing' ? 'Đang đồng bộ…' : status === 'error' ? 'Lỗi đồng bộ' : 'Đã đồng bộ Drive ✓'}
                </Text>
              </Pressable>
            )}
          </Row>
        </View>

        {status === 'error' && error && (
          <View style={{ marginTop: spacing.lg }}>
            <ErrorState message={error} onRetry={() => syncNow()} />
          </View>
        )}

        <SectionHeader title={monthLabel(key)} action="Thống kê" onAction={() => router.push('/stats')} />
        <Row gap={spacing.md}>
          <StatPill label="Thu nhập" amount={view.month.income} tone="success" icon="arrow-down-left" />
          <StatPill label="Chi tiêu" amount={view.month.expense} tone="danger" icon="arrow-up-right" />
        </Row>
        {view.hasAny && (
          <Text variant="caption" tone="secondary" style={{ marginTop: spacing.sm }}>
            Dự báo chi tiêu cả tháng: {fmt(view.projected)}
          </Text>
        )}

        {view.overBudget.length > 0 && (
          <>
            <SectionHeader title="Cảnh báo ngân sách" />
            <Card style={{ gap: spacing.md }}>
              {view.overBudget.map((b) => (
                <View key={b.budgetId} style={{ gap: spacing.xs }}>
                  <Row justify="space-between">
                    <Text variant="bodyStrong">{b.category.name}</Text>
                    <Text variant="caption" tone={b.ratio >= 1 ? 'danger' : 'warning'}>
                      {Math.round(b.ratio * 100)}%
                    </Text>
                  </Row>
                  <ProgressBar value={b.ratio} color={b.ratio >= 1 ? colors.danger : colors.warning} />
                </View>
              ))}
            </Card>
          </>
        )}

        <SectionHeader
          title="Giao dịch gần đây"
          action={view.hasAny ? 'Xem tất cả' : undefined}
          onAction={() => router.push('/transactions')}
        />
        <Card>
          {view.hasAny ? (
            <TransactionList items={view.recent} data={data} />
          ) : (
            <EmptyState
              icon="list"
              title="Chưa có giao dịch nào"
              message="Nhấn + để ghi lại khoản thu hoặc chi đầu tiên của bạn."
              actionLabel="Thêm giao dịch"
              onAction={() => router.push('/transaction')}
            />
          )}
        </Card>
      </Screen>
      <Fab label="Thêm giao dịch" onPress={() => router.push('/transaction')} />
    </View>
  );
}
