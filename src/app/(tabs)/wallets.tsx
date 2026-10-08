import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Fab, Money, Screen, WALLET_TYPES } from '@/components/finance';
import { EmptyState } from '@/components/states';
import { Card, Divider, ListItem, Row, SectionHeader, Text } from '@/components/ui';
import { alive, totalBalance, walletBalance } from '@/domain/finance';
import { useData } from '@/store/data';
import { useTheme } from '@/theme/ThemeProvider';

export default function WalletsScreen() {
  const { spacing } = useTheme();
  const data = useData((s) => s.data);
  const [showArchived, setShowArchived] = useState(false);

  const { active, archived, total } = useMemo(() => {
    const wallets = alive(data.wallets).map((w) => ({ wallet: w, balance: walletBalance(data, w.id) }));
    return {
      active: wallets.filter((w) => !w.wallet.archived),
      archived: wallets.filter((w) => w.wallet.archived),
      total: totalBalance(data),
    };
  }, [data]);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Card>
          <Text variant="caption" tone="secondary">
            Tổng tài sản trong ví
          </Text>
          <Money amount={total} variant="title" />
          <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
            {active.length} ví đang hoạt động
          </Text>
        </Card>

        <SectionHeader title="Ví của bạn" />
        <Card>
          {active.length === 0 ? (
            <EmptyState
              icon="credit-card"
              title="Chưa có ví nào"
              message="Tạo ví tiền mặt, tài khoản ngân hàng hoặc ví điện tử để bắt đầu."
              actionLabel="Tạo ví"
              onAction={() => router.push('/wallet/edit')}
            />
          ) : (
            active.map(({ wallet, balance }, i) => (
              <View key={wallet.id}>
                {i > 0 && <Divider />}
                <ListItem
                  icon={WALLET_TYPES[wallet.type].icon}
                  iconColor={wallet.color}
                  title={wallet.name}
                  subtitle={WALLET_TYPES[wallet.type].label}
                  onPress={() => router.push({ pathname: '/wallet/[id]', params: { id: wallet.id } })}
                  right={<Money amount={balance} colored={balance < 0} />}
                />
              </View>
            ))
          )}
        </Card>

        {archived.length > 0 && (
          <>
            <SectionHeader
              title={`Đã lưu trữ (${archived.length})`}
              action={showArchived ? 'Ẩn' : 'Hiện'}
              onAction={() => setShowArchived((v) => !v)}
            />
            {showArchived && (
              <Card>
                {archived.map(({ wallet, balance }) => (
                  <ListItem
                    key={wallet.id}
                    icon="archive"
                    iconColor={wallet.color}
                    title={wallet.name}
                    subtitle="Không tính vào tổng số dư"
                    onPress={() => router.push({ pathname: '/wallet/[id]', params: { id: wallet.id } })}
                    right={<Money amount={balance} />}
                  />
                ))}
              </Card>
            )}
          </>
        )}

        <Row style={{ marginTop: spacing.lg }}>
          <Text variant="caption" tone="secondary">
            Mẹo: dùng “Chuyển tiền” khi rút tiền từ ngân hàng ra tiền mặt — giao dịch này không bị tính là chi tiêu.
          </Text>
        </Row>
      </Screen>
      <Fab label="Thêm ví" onPress={() => router.push('/wallet/edit')} />
    </View>
  );
}
