import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { confirmDestructive, notify } from '@/components/confirm';
import { Screen, WALLET_TYPES } from '@/components/finance';
import { AmountField, ChipPicker, Field, SwatchPicker, TextField } from '@/components/form';
import { Button, IconButton } from '@/components/ui';
import { walletHasActivity } from '@/domain/finance';
import { amountToInput, parseAmount } from '@/domain/money';
import { SWATCHES } from '@/domain/seed';
import type { WalletType } from '@/domain/types';
import { useCurrency, useData } from '@/store/data';
import { useTheme } from '@/theme/ThemeProvider';

export default function WalletForm() {
  const { spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useData((s) => s.data);
  const saveWallet = useData((s) => s.saveWallet);
  const removeWallet = useData((s) => s.removeWallet);
  const currency = useCurrency();
  const existing = id ? data.wallets.find((w) => w.id === id && !w.deleted) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<WalletType>(existing?.type ?? 'bank');
  const [initial, setInitial] = useState(existing ? amountToInput(existing.initialBalance, currency) : '');
  const [color, setColor] = useState(existing?.color ?? SWATCHES[1]);
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && !name.trim() ? 'Nhập tên ví' : null;

  function onSave() {
    setSubmitted(true);
    if (!name.trim()) return;
    saveWallet({
      ...existing,
      id: existing?.id,
      name: name.trim(),
      type,
      color,
      initialBalance: parseAmount(initial, currency) ?? 0,
    });
    router.back();
  }

  function onRemove() {
    if (!existing) return;
    const used = walletHasActivity(data, existing.id);
    confirmDestructive(
      used ? 'Lưu trữ ví?' : 'Xóa ví?',
      used
        ? 'Ví đã có giao dịch nên sẽ được lưu trữ để giữ lịch sử. Bạn có thể khôi phục bất cứ lúc nào.'
        : 'Ví sẽ bị xóa vĩnh viễn.',
      used ? 'Lưu trữ' : 'Xóa',
      () => {
        const result = removeWallet(existing.id);
        if (result === 'archived') notify('Đã lưu trữ ví');
        router.dismissTo('/wallets');
      },
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: existing ? 'Sửa ví' : 'Ví mới',
          headerLeft: () => <IconButton icon="x" label="Đóng" onPress={() => router.back()} />,
        }}
      />
      <Screen>
        <Field label="Tên ví" error={nameError}>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder="VD: Vietcombank, MoMo"
            invalid={!!nameError}
            autoFocus={!existing}
            maxLength={40}
          />
        </Field>
        <Field label="Loại ví">
          <ChipPicker
            options={(Object.keys(WALLET_TYPES) as WalletType[]).map((t) => ({
              id: t,
              label: WALLET_TYPES[t].label,
              icon: WALLET_TYPES[t].icon,
            }))}
            value={type}
            onChange={(v) => setType(v as WalletType)}
          />
        </Field>
        <Field
          label="Số dư ban đầu"
          hint={
            type === 'credit'
              ? 'Với thẻ tín dụng, nhập dư nợ hiện tại dưới dạng 0 và ghi chi tiêu như bình thường.'
              : 'Số tiền đang có trong ví lúc bắt đầu theo dõi.'
          }
        >
          <AmountField value={initial} onChange={setInitial} currency={currency} />
        </Field>
        <Field label="Màu">
          <SwatchPicker colors={SWATCHES} value={color} onChange={setColor} />
        </Field>
        <Button title="Lưu ví" icon="check" onPress={onSave} />
        {existing && (
          <Button
            title="Xóa / lưu trữ ví"
            icon="trash-2"
            variant="danger"
            onPress={onRemove}
            style={{ marginTop: spacing.md }}
          />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
