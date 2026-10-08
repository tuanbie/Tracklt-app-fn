import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { confirmDestructive } from '@/components/confirm';
import { Money, Screen, WALLET_TYPES } from '@/components/finance';
import { AmountField, ChipPicker, DateQuickPicker, Field, Segmented, TextField } from '@/components/form';
import { Button, IconButton, Row, type IconName } from '@/components/ui';
import { alive, walletBalance } from '@/domain/finance';
import { amountToInput, parseAmount } from '@/domain/money';
import type { TransactionKind } from '@/domain/types';
import { useCurrency, useData } from '@/store/data';
import { useTheme } from '@/theme/ThemeProvider';

const KINDS: { value: TransactionKind; label: string }[] = [
  { value: 'expense', label: 'Chi' },
  { value: 'income', label: 'Thu' },
  { value: 'transfer', label: 'Chuyển' },
];

export default function TransactionForm() {
  const { spacing } = useTheme();
  const params = useLocalSearchParams<{ id?: string; walletId?: string; kind?: TransactionKind }>();
  const data = useData((s) => s.data);
  const saveTransaction = useData((s) => s.saveTransaction);
  const deleteTransaction = useData((s) => s.deleteTransaction);
  const currency = useCurrency();

  const existing = params.id ? data.transactions.find((t) => t.id === params.id && !t.deleted) : undefined;
  const wallets = useMemo(
    () => alive(data.wallets).filter((w) => !w.archived || w.id === existing?.walletId),
    [data.wallets, existing],
  );

  const [kind, setKind] = useState<TransactionKind>(existing?.kind ?? params.kind ?? 'expense');
  const [amount, setAmount] = useState(existing ? amountToInput(existing.amount, currency) : '');
  const [walletId, setWalletId] = useState(existing?.walletId ?? params.walletId ?? wallets[0]?.id);
  const [toWalletId, setToWalletId] = useState(existing?.toWalletId ?? wallets.find((w) => w.id !== walletId)?.id);
  const [categoryId, setCategoryId] = useState(existing?.categoryId);
  const [note, setNote] = useState(existing?.note ?? '');
  const [occurredAt, setOccurredAt] = useState(() => existing?.occurredAt ?? Date.now());
  const [submitted, setSubmitted] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);

  const categories = alive(data.categories).filter((c) => c.kind === kind);
  const parsed = parseAmount(amount, currency);

  const errors = {
    amount: !parsed || parsed <= 0 ? 'Nhập số tiền lớn hơn 0' : null,
    wallet: !walletId ? 'Chọn ví' : null,
    category: kind !== 'transfer' && !categories.some((c) => c.id === categoryId) ? 'Chọn danh mục' : null,
    toWallet: kind === 'transfer' && (!toWalletId || toWalletId === walletId) ? 'Chọn ví nhận khác ví nguồn' : null,
  };
  const valid = !Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => (submitted || (k === 'amount' && amountTouched) ? errors[k] : null);

  const walletOptions = wallets.map((w) => ({
    id: w.id,
    label: w.name,
    icon: WALLET_TYPES[w.type].icon,
    color: w.color,
  }));

  function onSave() {
    setSubmitted(true);
    if (!valid || !parsed || !walletId) return;
    saveTransaction({
      id: existing?.id,
      kind,
      amount: parsed,
      walletId,
      toWalletId: kind === 'transfer' ? toWalletId : undefined,
      categoryId: kind === 'transfer' ? undefined : categoryId,
      note: note.trim(),
      occurredAt,
    });
    router.back();
  }

  function onDelete() {
    if (!existing) return;
    confirmDestructive('Xóa giao dịch?', 'Số dư ví sẽ được tính lại.', 'Xóa', () => {
      deleteTransaction(existing.id);
      router.back();
    });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: existing ? 'Sửa giao dịch' : 'Thêm giao dịch',
          headerLeft: () => <IconButton icon="x" label="Đóng" onPress={() => router.back()} />,
          headerRight: existing
            ? () => <IconButton icon="trash-2" label="Xóa giao dịch" onPress={onDelete} />
            : undefined,
        }}
      />
      <Screen>
        <View style={{ marginBottom: spacing.lg }}>
          <Segmented
            options={KINDS}
            value={kind}
            onChange={(k) => {
              setKind(k);
              setCategoryId(undefined);
            }}
          />
        </View>

        <Field label="Số tiền" error={show('amount')}>
          <AmountField
            value={amount}
            onChange={setAmount}
            currency={currency}
            invalid={!!show('amount')}
            tone={kind === 'expense' ? 'danger' : kind === 'income' ? 'success' : 'primary'}
            autoFocus={!existing}
            onBlur={() => setAmountTouched(true)}
          />
        </Field>

        {kind !== 'transfer' && (
          <Field label="Danh mục" error={show('category')}>
            <ChipPicker
              options={categories.map((c) => ({ id: c.id, label: c.name, icon: c.icon as IconName, color: c.color }))}
              value={categoryId}
              onChange={setCategoryId}
              invalid={!!show('category')}
            />
          </Field>
        )}

        <Field
          label={kind === 'transfer' ? 'Từ ví' : 'Ví'}
          error={show('wallet')}
          hint={walletId ? undefined : 'Hãy tạo ví trước trong tab Ví'}
        >
          <ChipPicker options={walletOptions} value={walletId} onChange={setWalletId} />
          {walletId && (
            <Row gap={spacing.xs}>
              <Money amount={walletBalance(data, walletId)} variant="caption" />
            </Row>
          )}
        </Field>

        {kind === 'transfer' && (
          <Field label="Đến ví" error={show('toWallet')}>
            <ChipPicker
              options={walletOptions.filter((w) => w.id !== walletId)}
              value={toWalletId}
              onChange={setToWalletId}
              invalid={!!show('toWallet')}
            />
          </Field>
        )}

        <Field label="Ngày">
          <DateQuickPicker value={occurredAt} onChange={setOccurredAt} />
        </Field>

        <Field label="Ghi chú (tùy chọn)">
          <TextField
            value={note}
            onChangeText={setNote}
            placeholder="VD: Cà phê với team"
            maxLength={120}
            returnKeyType="done"
          />
        </Field>

        <Button
          title={existing ? 'Lưu thay đổi' : 'Lưu giao dịch'}
          icon="check"
          onPress={onSave}
          disabled={submitted && !valid}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
