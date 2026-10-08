import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { DonutChart, IncomeExpenseBars } from '@/components/charts';
import { Money, MonthSwitcher, Screen, useFormatMoney } from '@/components/finance';
import { Segmented } from '@/components/form';
import { EmptyState } from '@/components/states';
import { Card, IconBadge, ListItem, ProgressBar, Row, SectionHeader, Text, type IconName } from '@/components/ui';
import { monthKey, monthRange, shiftMonth } from '@/domain/dates';
import { budgetUsage, byCategory, monthlyTrend, monthSummary } from '@/domain/finance';
import { useData } from '@/store/data';
import { useTheme } from '@/theme/ThemeProvider';
import { useNow } from '@/hooks/useNow';

export default function StatsScreen() {
  const { colors, spacing } = useTheme();
  const data = useData((s) => s.data);
  const fmt = useFormatMoney();
  const current = monthKey(useNow());
  const [key, setKey] = useState(current);
  const [kind, setKind] = useState<'expense' | 'income'>('expense');

  const view = useMemo(() => {
    const { from, to } = monthRange(key);
    const summary = monthSummary(data, key);
    const prev = monthSummary(data, shiftMonth(key, -1));
    return {
      summary,
      expenseChange: prev.expense ? (summary.expense - prev.expense) / prev.expense : null,
      slices: byCategory(data, kind, from, to),
      trend: monthlyTrend(data, key, 6),
      budgets: budgetUsage(data, key),
    };
  }, [data, key, kind]);

  const total = kind === 'expense' ? view.summary.expense : view.summary.income;

  return (
    <Screen>
      <MonthSwitcher value={key} max={current} onChange={(d) => setKey((k) => shiftMonth(k, d))} />

      <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
        <Row justify="space-between">
          <View>
            <Text variant="caption" tone="secondary">
              Thu nhập
            </Text>
            <Money amount={view.summary.income} />
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text variant="caption" tone="secondary">
              Chi tiêu
            </Text>
            <Money amount={view.summary.expense} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="caption" tone="secondary">
              Chênh lệch
            </Text>
            <Money amount={view.summary.net} colored signed />
          </View>
        </Row>
        {view.expenseChange !== null && (
          <Text variant="caption" tone={view.expenseChange > 0 ? 'danger' : 'success'}>
            Chi tiêu {view.expenseChange > 0 ? 'tăng' : 'giảm'} {Math.abs(Math.round(view.expenseChange * 100))}% so với
            tháng trước
          </Text>
        )}
      </Card>

      <SectionHeader title="Theo danh mục" />
      <Card style={{ gap: spacing.lg }}>
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'expense', label: 'Chi tiêu' },
            { value: 'income', label: 'Thu nhập' },
          ]}
        />
        {view.slices.length === 0 ? (
          <EmptyState
            icon="pie-chart"
            title="Chưa có dữ liệu"
            message={`Không có khoản ${kind === 'expense' ? 'chi' : 'thu'} nào trong tháng này.`}
          />
        ) : (
          <>
            <View style={{ alignItems: 'center' }}>
              <DonutChart
                slices={view.slices.map((s) => ({ value: s.amount, color: s.category.color }))}
                centerLabel={kind === 'expense' ? 'Tổng chi' : 'Tổng thu'}
                centerValue={fmt(total, { compact: true })}
              />
            </View>
            <View>
              {view.slices.map((s) => (
                <ListItem
                  key={s.category.id}
                  icon={s.category.icon as IconName}
                  iconColor={s.category.color}
                  title={s.category.name}
                  subtitle={`${Math.round(s.share * 100)}%`}
                  right={<Money amount={s.amount} />}
                />
              ))}
            </View>
          </>
        )}
      </Card>

      <SectionHeader title="Xu hướng 6 tháng" />
      <Card>
        {view.trend.some((p) => p.income || p.expense) ? (
          <IncomeExpenseBars points={view.trend} />
        ) : (
          <EmptyState
            icon="bar-chart-2"
            title="Chưa đủ dữ liệu"
            message="Biểu đồ sẽ hiện khi bạn có giao dịch trong 6 tháng gần nhất."
          />
        )}
      </Card>

      <SectionHeader title="Ngân sách" action="Thêm" onAction={() => router.push('/budget/edit')} />
      <Card style={{ gap: spacing.lg }}>
        {view.budgets.length === 0 ? (
          <EmptyState
            icon="sliders"
            title="Chưa đặt ngân sách"
            message="Giới hạn chi tiêu hàng tháng cho từng danh mục để không vượt kế hoạch."
            actionLabel="Đặt ngân sách"
            onAction={() => router.push('/budget/edit')}
          />
        ) : (
          view.budgets.map((b) => {
            const barColor = b.ratio >= 1 ? colors.danger : b.ratio >= 0.8 ? colors.warning : colors.success;
            return (
              <Pressable
                key={b.budgetId}
                style={{ gap: spacing.sm }}
                accessibilityRole="button"
                accessibilityLabel={`Sửa ngân sách ${b.category.name}`}
                onPress={() => router.push({ pathname: '/budget/edit', params: { id: b.budgetId } })}
              >
                <Row gap={spacing.md}>
                  <IconBadge icon={b.category.icon as IconName} color={b.category.color} size={32} />
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    {b.category.name}
                  </Text>
                  <Text variant="caption" tone={b.ratio >= 1 ? 'danger' : 'secondary'}>
                    {fmt(b.spent)} / {fmt(b.limit)}
                  </Text>
                </Row>
                <ProgressBar value={b.ratio} color={barColor} />
                {b.ratio >= 1 && (
                  <Text variant="caption" tone="danger">
                    Vượt ngân sách {fmt(b.spent - b.limit)}
                  </Text>
                )}
              </Pressable>
            );
          })
        )}
      </Card>
    </Screen>
  );
}
