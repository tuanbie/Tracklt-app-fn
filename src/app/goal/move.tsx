import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Money, Screen, WALLET_TYPES } from '@/components/finance';
import { AmountField, ChipPicker, Field, Segmented, TextField } from '@/components/form';
import { Button, IconButton } from '@/components/ui';
import { alive, goalSaved, walletBalance } from '@/domain/finance';
import { formatMoney, parseAmount } from '@/domain/money';
import { useCurrency, useData } from '@/store/data';
import { useTheme } from '@/theme/ThemeProvider';

/** Deposit into / withdraw from a savings goal, moving money to/from a wallet. */
export default function MoveSavings() {
  const { spacing } = useTheme();
  const params = useLocalSearchParams<{ goalId: string; dir?: 'in' | 'out' }>();
  const data = useData((s) => s.data);
  const addSavingsEntry = useData((s) => s.addSavingsEntry);
  const currency = useCurrency();
  const goal = data.goals.find((g) => g.id === params.goalId);
  const wallets = alive(data.wallets).filter((w) => !w.archived);

  const [dir, setDir] = useState<'in' | 'out'>(params.dir ?? 'in');
  const [amount, setAmount] = useState('');
  // Default to the wallet with the most money — the likeliest source for a deposit.
  const [walletId, setWalletId] = useState(
    () => [...wallets].sort((a, b) => walletBalance(data, b.id) - walletBalance(data, a.id))[0]?.id,
  );
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!goal) return null;
  const saved = goalSaved(data, goal.id);
  const parsed = parseAmount(amount, currency);
  const balance = walletId ? walletBalance(data, walletId) : 0;

  const amountError =
    !parsed || parsed <= 0
      ? 'Nhập số tiền lớn hơn 0'
      : dir === 'out' && parsed > saved
        ? `Chỉ có thể rút tối đa ${formatMoney(saved, currency)}`
        : dir === 'in' && parsed > balance
          ? 'Số dư ví không đủ'
          : null;
  const walletError = !walletId ? 'Chọn ví' : null;

  function onSave() {
    setSubmitted(true);
    if (amountError || walletError || !parsed || !walletId || !goal) return;
    addSavingsEntry({
      goalId: goal.id,
      walletId,
      amount: dir === 'in' ? parsed : -parsed,
      note: note.trim(),
      occurredAt: Date.now(),
    });
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: goal.name,
          headerLeft: () => <IconButton icon="x" label="Đóng" onPress={() => router.back()} />,
        }}
      />
      <Screen>
        <View style={{ marginBottom: spacing.lg }}>
          <Segmented
            value={dir}
            onChange={setDir}
            options={[
              { value: 'in', label: 'Nạp vào' },
              { value: 'out', label: 'Rút ra' },
            ]}
          />
        </View>
        <Field label="Số tiền" error={submitted ? amountError : null}>
          <AmountField
            value={amount}
            onChange={setAmount}
            currency={currency}
            autoFocus
            invalid={submitted && !!amountError}
            tone={dir === 'in' ? 'success' : 'primary'}
          />
        </Field>
        <Field label={dir === 'in' ? 'Lấy từ ví' : 'Trả về ví'} error={submitted ? walletError : null}>
          <ChipPicker
            options={wallets.map((w) => ({ id: w.id, label: w.name, icon: WALLET_TYPES[w.type].icon, color: w.color }))}
            value={walletId}
            onChange={setWalletId}
          />
          {walletId && <Money amount={balance} variant="caption" />}
        </Field>
        <Field label="Ghi chú (tùy chọn)">
          <TextField value={note} onChangeText={setNote} placeholder="VD: Tiết kiệm lương tháng 10" maxLength={120} />
        </Field>
        <Button
          title={dir === 'in' ? 'Nạp tiền' : 'Rút tiền'}
          icon="check"
          onPress={onSave}
          style={{ marginTop: spacing.sm }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
