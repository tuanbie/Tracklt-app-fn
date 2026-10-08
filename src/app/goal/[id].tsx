import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { confirmDestructive } from '@/components/confirm';
import { DonutChart } from '@/components/charts';
import { Screen, useFormatMoney } from '@/components/finance';
import { EmptyState } from '@/components/states';
import { Button, Card, Divider, IconButton, ListItem, Row, SectionHeader, Text } from '@/components/ui';
import { dayLabel, formatDate } from '@/domain/dates';
import { alive, goalSaved, monthlyNeeded } from '@/domain/finance';
import { useData } from '@/store/data';
import { useTheme } from '@/theme/ThemeProvider';
import { useNow } from '@/hooks/useNow';

export default function GoalDetail() {
  const { colors, spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData((s) => s.data);
  const deleteSavingsEntry = useData((s) => s.deleteSavingsEntry);
  const fmt = useFormatMoney();
  const now = useNow();
  const goal = data.goals.find((g) => g.id === id && !g.deleted);

  const entries = useMemo(
    () =>
      alive(data.savingsEntries)
        .filter((e) => e.goalId === id)
        .sort((a, b) => b.occurredAt - a.occurredAt),
    [data.savingsEntries, id],
  );

  if (!goal) {
    return (
      <Screen>
        <EmptyState icon="alert-circle" title="Không tìm thấy mục tiêu" message="Mục tiêu này có thể đã bị xóa." />
      </Screen>
    );
  }

  const saved = goalSaved(data, goal.id);
  const remaining = Math.max(0, goal.targetAmount - saved);
  const perMonth = monthlyNeeded(remaining, goal.deadline, now);
  const walletName = (wid: string) => data.wallets.find((w) => w.id === wid)?.name ?? '?';

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: goal.name,
          headerRight: () => (
            <IconButton
              icon="edit-2"
              label="Sửa mục tiêu"
              onPress={() => router.push({ pathname: '/goal/edit', params: { id: goal.id } })}
            />
          ),
        }}
      />
      <Card style={{ alignItems: 'center', gap: spacing.md }}>
        <DonutChart
          slices={[
            { value: saved, color: goal.color },
            { value: remaining, color: colors.surfaceRaised },
          ]}
          centerLabel={`${Math.round((saved / (goal.targetAmount || 1)) * 100)}%`}
          centerValue={fmt(saved, { compact: true })}
        />
        <Text tone="secondary" align="center">
          Mục tiêu {fmt(goal.targetAmount)}
          {goal.deadline ? ` · hạn ${formatDate(goal.deadline)}` : ''}
        </Text>
        {remaining > 0 ? (
          <Text variant="bodyStrong" align="center">
            Còn thiếu {fmt(remaining)}
            {perMonth ? ` — khoảng ${fmt(perMonth)}/tháng` : ''}
          </Text>
        ) : (
          <Text variant="bodyStrong" tone="success" align="center">
            🎉 Bạn đã đạt mục tiêu!
          </Text>
        )}
        <Row gap={spacing.sm} style={{ alignSelf: 'stretch' }}>
          <Button
            title="Nạp tiền"
            icon="arrow-down-circle"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/goal/move', params: { goalId: goal.id, dir: 'in' } })}
          />
          <Button
            title="Rút tiền"
            icon="arrow-up-circle"
            variant="secondary"
            style={{ flex: 1 }}
            disabled={saved <= 0}
            onPress={() => router.push({ pathname: '/goal/move', params: { goalId: goal.id, dir: 'out' } })}
          />
        </Row>
      </Card>

      <SectionHeader title="Lịch sử nạp / rút" />
      <Card>
        {entries.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Chưa nạp lần nào"
            message="Nhấn “Nạp tiền” để chuyển tiền từ ví vào mục tiêu này."
          />
        ) : (
          entries.map((e, i) => (
            <View key={e.id}>
              {i > 0 && <Divider />}
              <ListItem
                icon={e.amount > 0 ? 'arrow-down-circle' : 'arrow-up-circle'}
                iconColor={e.amount > 0 ? colors.success : colors.warning}
                title={e.amount > 0 ? `Nạp từ ${walletName(e.walletId)}` : `Rút về ${walletName(e.walletId)}`}
                subtitle={[dayLabel(e.occurredAt), e.note].filter(Boolean).join(' · ')}
                onLongPress={() =>
                  confirmDestructive('Xóa giao dịch tiết kiệm?', 'Số tiền sẽ được hoàn lại ví tương ứng.', 'Xóa', () =>
                    deleteSavingsEntry(e.id),
                  )
                }
                right={
                  <Text variant="bodyStrong" tone={e.amount > 0 ? 'success' : 'warning'}>
                    {fmt(e.amount, { signed: true })}
                  </Text>
                }
              />
            </View>
          ))
        )}
      </Card>
      {entries.length > 0 && (
        <Text variant="caption" tone="secondary" style={{ marginTop: spacing.sm }}>
          Nhấn giữ một dòng để xóa.
        </Text>
      )}
    </Screen>
  );
}
