import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { Screen } from '@/components/finance';
import { AmountField, ChipPicker, Field } from '@/components/form';
import { Button, IconButton, type IconName } from '@/components/ui';
import { alive } from '@/domain/finance';
import { amountToInput, parseAmount } from '@/domain/money';
import { useCurrency, useData } from '@/store/data';
import { useTheme } from '@/theme/ThemeProvider';

export default function BudgetForm() {
  const { spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useData((s) => s.data);
  const saveBudget = useData((s) => s.saveBudget);
  const deleteBudget = useData((s) => s.deleteBudget);
  const currency = useCurrency();
  const existing = id ? data.budgets.find((b) => b.id === id && !b.deleted) : undefined;

  const budgeted = new Set(alive(data.budgets).map((b) => b.categoryId));
  const categories = alive(data.categories).filter(
    (c) => c.kind === 'expense' && (!budgeted.has(c.id) || c.id === existing?.categoryId),
  );

  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id);
  const [limit, setLimit] = useState(existing ? amountToInput(existing.monthlyLimit, currency) : '');
  const [submitted, setSubmitted] = useState(false);
  const parsed = parseAmount(limit, currency);
  const limitError = !parsed || parsed <= 0 ? 'Nhập hạn mức lớn hơn 0' : null;

  function onSave() {
    setSubmitted(true);
    if (limitError || !parsed || !categoryId) return;
    saveBudget({ id: existing?.id, categoryId, monthlyLimit: parsed });
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: existing ? 'Sửa ngân sách' : 'Ngân sách mới',
          headerLeft: () => <IconButton icon="x" label="Đóng" onPress={() => router.back()} />,
        }}
      />
      <Screen>
        <Field
          label="Danh mục chi tiêu"
          hint={categories.length === 0 ? 'Tất cả danh mục đã có ngân sách.' : undefined}
        >
          <ChipPicker
            options={categories.map((c) => ({ id: c.id, label: c.name, icon: c.icon as IconName, color: c.color }))}
            value={categoryId}
            onChange={setCategoryId}
          />
        </Field>
        <Field label="Hạn mức mỗi tháng" error={submitted ? limitError : null}>
          <AmountField
            value={limit}
            onChange={setLimit}
            currency={currency}
            autoFocus={!existing}
            invalid={submitted && !!limitError}
          />
        </Field>
        <Button title="Lưu ngân sách" icon="check" onPress={onSave} disabled={!categoryId} />
        {existing && (
          <Button
            title="Xóa ngân sách"
            icon="trash-2"
            variant="danger"
            style={{ marginTop: spacing.md }}
            onPress={() => {
              deleteBudget(existing.id);
              router.back();
            }}
          />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
