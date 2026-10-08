import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Fab, Money, Screen, useFormatMoney } from '@/components/finance';
import { EmptyState } from '@/components/states';
import { Card, IconBadge, ProgressBar, Row, SectionHeader, Text, type IconName } from '@/components/ui';
import { formatDate, monthKey } from '@/domain/dates';
import { alive, goalSaved, monthlyNeeded, monthSummary, totalSaved } from '@/domain/finance';
import { useData } from '@/store/data';
import { useTheme } from '@/theme/ThemeProvider';
import { useNow } from '@/hooks/useNow';

export default function SavingsScreen() {
  const { spacing } = useTheme();
  const data = useData((s) => s.data);
  const fmt = useFormatMoney();
  const now = useNow();

  const view = useMemo(() => {
    const month = monthSummary(data, monthKey(now));
    return {
      total: totalSaved(data),
      savingsRate: month.income > 0 ? month.saved / month.income : null,
      goals: alive(data.goals)
        .map((g) => ({ goal: g, saved: goalSaved(data, g.id) }))
        .sort((a, b) => (a.goal.deadline ?? Infinity) - (b.goal.deadline ?? Infinity)),
    };
  }, [data, now]);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Card>
          <Text variant="caption" tone="secondary">
            Tổng tiền tiết kiệm
          </Text>
          <Money amount={view.total} variant="title" />
          {view.savingsRate !== null && (
            <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
              Tỷ lệ tiết kiệm tháng này: {Math.round(view.savingsRate * 100)}% thu nhập
            </Text>
          )}
        </Card>

        <SectionHeader title="Mục tiêu" />
        {view.goals.length === 0 ? (
          <Card>
            <EmptyState
              icon="target"
              title="Chưa có mục tiêu tiết kiệm"
              message="Đặt mục tiêu như mua laptop, du lịch hay quỹ khẩn cấp, rồi nạp tiền dần từ ví."
              actionLabel="Tạo mục tiêu"
              onAction={() => router.push('/goal/edit')}
            />
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            {view.goals.map(({ goal, saved }) => {
              const ratio = goal.targetAmount ? saved / goal.targetAmount : 0;
              const perMonth = monthlyNeeded(goal.targetAmount - saved, goal.deadline, now);
              return (
                <Pressable
                  key={goal.id}
                  onPress={() => router.push({ pathname: '/goal/[id]', params: { id: goal.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${goal.name}, đạt ${Math.round(ratio * 100)}%`}
                >
                  <Card style={{ gap: spacing.md }}>
                    <Row gap={spacing.md}>
                      <IconBadge icon={goal.icon as IconName} color={goal.color} />
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {goal.name}
                        </Text>
                        <Text variant="caption" tone="secondary">
                          {fmt(saved)} / {fmt(goal.targetAmount)}
                        </Text>
                      </View>
                      <Text variant="bodyStrong" tone={ratio >= 1 ? 'success' : 'brand'}>
                        {Math.min(999, Math.round(ratio * 100))}%
                      </Text>
                    </Row>
                    <ProgressBar value={ratio} color={goal.color} />
                    <Text variant="caption" tone="secondary">
                      {ratio >= 1
                        ? '🎉 Đã hoàn thành mục tiêu!'
                        : goal.deadline
                          ? `Hạn ${formatDate(goal.deadline)}${perMonth ? ` · cần ~${fmt(perMonth)}/tháng` : ''}`
                          : 'Không đặt hạn'}
                    </Text>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </Screen>
      <Fab label="Thêm mục tiêu" onPress={() => router.push('/goal/edit')} />
    </View>
  );
}
