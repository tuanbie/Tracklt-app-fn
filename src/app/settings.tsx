import { useState } from 'react';
import { Share, Switch, View } from 'react-native';

import { confirmDestructive, notify } from '@/components/confirm';
import { Screen } from '@/components/finance';
import { ChipPicker, Field, Segmented } from '@/components/form';
import { ErrorState } from '@/components/states';
import { Button, Card, Divider, ListItem, Row, SectionHeader, Text } from '@/components/ui';
import { formatDateTime } from '@/domain/dates';
import { CURRENCIES } from '@/domain/money';
import type { CurrencyCode } from '@/domain/types';
import { signIn, signOut } from '@/services/googleAuth';
import { FILE_NAME, FOLDER_NAME } from '@/services/googleDrive';
import { hasUnsyncedChanges, syncNow, useSync } from '@/services/sync';
import { useData } from '@/store/data';
import { usePrefs, type ThemeMode } from '@/store/prefs';
import { useTheme } from '@/theme/ThemeProvider';

export default function SettingsScreen() {
  const { colors, spacing } = useTheme();
  const { account, status, error, lastSyncedAt, setAccount, clear } = useSync();
  useData((s) => s.revision); // re-render when local edits change the "unsynced" badge
  const currency = useData((s) => s.data.meta.currency);
  const setCurrency = useData((s) => s.setCurrency);
  const resetAll = useData((s) => s.resetAll);
  const prefs = usePrefs();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  async function onConnect() {
    setSigningIn(true);
    setAuthError(null);
    try {
      const user = await signIn();
      setAccount({ email: user.user.email, name: user.user.name, photo: user.user.photo });
      await syncNow();
    } catch (e) {
      if (!(e instanceof Error && 'kind' in e && e.kind === 'cancelled')) setAuthError((e as Error).message);
    } finally {
      setSigningIn(false);
    }
  }

  function onDisconnect() {
    confirmDestructive(
      'Ngắt kết nối Google Drive?',
      'Dữ liệu vẫn được giữ trên máy này và trên Drive. Ứng dụng sẽ ngừng đồng bộ.',
      'Ngắt kết nối',
      async () => {
        await signOut();
        clear();
      },
    );
  }

  async function onExport() {
    const json = JSON.stringify(useData.getState().data, null, 2);
    await Share.share({ title: FILE_NAME, message: json });
  }

  return (
    <Screen>
      <SectionHeader title="Google Drive" />
      <Card style={{ gap: spacing.md }}>
        {account ? (
          <>
            <ListItem
              icon="cloud"
              title={account.name ?? account.email}
              subtitle={account.email}
              right={
                <Text
                  variant="caption"
                  tone={status === 'error' ? 'danger' : hasUnsyncedChanges() ? 'warning' : 'success'}
                >
                  {status === 'syncing'
                    ? 'Đang đồng bộ…'
                    : status === 'error'
                      ? 'Lỗi'
                      : hasUnsyncedChanges()
                        ? 'Chưa đồng bộ'
                        : 'Đã đồng bộ'}
                </Text>
              }
            />
            <Text variant="caption" tone="secondary">
              File: My Drive/{FOLDER_NAME}/{FILE_NAME}
              {lastSyncedAt ? `\nLần cuối: ${formatDateTime(lastSyncedAt)}` : ''}
            </Text>
            {status === 'error' && error && <ErrorState message={error} />}
            <Row gap={spacing.sm}>
              <Button
                title="Đồng bộ ngay"
                icon="refresh-cw"
                onPress={() => syncNow()}
                loading={status === 'syncing'}
                style={{ flex: 1 }}
              />
              <Button title="Ngắt" icon="log-out" variant="secondary" onPress={onDisconnect} />
            </Row>
            <Divider />
            <Row justify="space-between">
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">Tự động đồng bộ</Text>
                <Text variant="caption" tone="secondary">
                  Sau mỗi thay đổi và khi mở ứng dụng
                </Text>
              </View>
              <Switch
                value={prefs.autoSync}
                onValueChange={prefs.setAutoSync}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel="Tự động đồng bộ"
              />
            </Row>
          </>
        ) : (
          <>
            <Text tone="secondary">
              Sao lưu và đồng bộ dữ liệu giữa các thiết bị bằng một file JSON trong Google Drive của bạn. TrackIt chỉ
              truy cập được file do chính nó tạo ra.
            </Text>
            {authError && <ErrorState message={authError} />}
            <Button title="Kết nối Google Drive" icon="cloud" onPress={onConnect} loading={signingIn} />
          </>
        )}
      </Card>

      <SectionHeader title="Hiển thị" />
      <Card>
        <Field label="Giao diện">
          <Segmented<ThemeMode>
            value={prefs.themeMode}
            onChange={prefs.setThemeMode}
            options={[
              { value: 'system', label: 'Hệ thống' },
              { value: 'light', label: 'Sáng' },
              { value: 'dark', label: 'Tối' },
            ]}
          />
        </Field>
        <Field label="Tiền tệ" hint="Chỉ đổi đơn vị hiển thị, không quy đổi tỷ giá.">
          <ChipPicker
            options={(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => ({ id: c, label: CURRENCIES[c].label }))}
            value={currency}
            onChange={(c) => setCurrency(c as CurrencyCode)}
          />
        </Field>
        <Row justify="space-between">
          <Text variant="bodyStrong">Ẩn số dư</Text>
          <Switch
            value={prefs.hideBalances}
            onValueChange={prefs.toggleHideBalances}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel="Ẩn số dư"
          />
        </Row>
      </Card>

      <SectionHeader title="Dữ liệu" />
      <Card style={{ gap: spacing.md }}>
        <Button title="Xuất dữ liệu JSON" icon="share" variant="secondary" onPress={onExport} />
        <Button
          title="Xóa toàn bộ dữ liệu trên máy"
          icon="trash-2"
          variant="danger"
          onPress={() =>
            confirmDestructive(
              'Xóa toàn bộ dữ liệu?',
              account
                ? 'Dữ liệu trên máy sẽ bị xóa. Lần đồng bộ tiếp theo sẽ tải lại dữ liệu từ Google Drive.'
                : 'Không thể hoàn tác. Hãy xuất dữ liệu trước nếu cần.',
              'Xóa',
              () => {
                resetAll();
                // Force a fresh pull next time instead of overwriting Drive with an empty dataset.
                useSync.setState({ syncedRevision: -1 });
                notify('Đã xóa dữ liệu trên máy');
              },
            )
          }
        />
      </Card>

      <Text variant="caption" tone="secondary" align="center" style={{ marginTop: spacing.xl }}>
        TrackIt v1.0.0
      </Text>
    </Screen>
  );
}
