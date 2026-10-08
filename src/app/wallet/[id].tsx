import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Money, Screen, TransactionList, WALLET_TYPES } from '@/components/finance';
import { EmptyState } from '@/components/states';
import { Button, Card, IconBadge, IconButton, Row, SectionHeader, Text } from '@/components/ui';
import { alive, walletBalance } from '@/domain/finance';
import { useData } from '@/store/data';
import { useTheme } from '@/theme/ThemeProvider';

export default function WalletDetail() {
  const { spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData((s) => s.data);
  const saveWallet = useData((s) => s.saveWallet);
  const wallet = data.wallets.find((w) => w.id === id && !w.deleted);

  const txns = useMemo(
    () => alive(data.transactions).filter((t) => t.walletId === id || t.toWalletId === id),
    [data.transactions, id],
  );

  if (!wallet) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle"
          title="Không tìm thấy ví"
          message="Ví này có thể đã bị xóa trên thiết bị khác."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: wallet.name,
          headerRight: () => (
            <IconButton
              icon="edit-2"
              label="Sửa ví"
              onPress={() => router.push({ pathname: '/wallet/edit', params: { id: wallet.id } })}
            />
          ),
        }}
      />
      <Card style={{ gap: spacing.md }}>
        <Row gap={spacing.md}>
          <IconBadge icon={WALLET_TYPES[wallet.type].icon} color={wallet.color} size={48} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="secondary">
              {WALLET_TYPES[wallet.type].label}
              {wallet.archived ? ' · Đã lưu trữ' : ''}
            </Text>
            <Money amount={walletBalance(data, wallet.id)} variant="title" />
          </View>
        </Row>
        {wallet.archived ? (
          <Button
            title="Khôi phục ví"
            icon="rotate-ccw"
            variant="secondary"
            onPress={() => saveWallet({ ...wallet, archived: false })}
          />
        ) : (
          <Row gap={spacing.sm}>
            <Button
              title="Chi"
              icon="minus"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() =>
                router.push({ pathname: '/transaction', params: { walletId: wallet.id, kind: 'expense' } })
              }
            />
            <Button
              title="Thu"
              icon="plus"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/transaction', params: { walletId: wallet.id, kind: 'income' } })}
            />
            <Button
              title="Chuyển"
              icon="repeat"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() =>
                router.push({ pathname: '/transaction', params: { walletId: wallet.id, kind: 'transfer' } })
              }
            />
          </Row>
        )}
      </Card>

      <SectionHeader title="Lịch sử" />
      <Card>
        {txns.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Chưa có giao dịch"
            message="Các khoản thu, chi và chuyển tiền của ví này sẽ hiện ở đây."
          />
        ) : (
          <TransactionList items={txns} data={data} />
        )}
      </Card>
    </Screen>
  );
}
