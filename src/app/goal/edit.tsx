import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { confirmDestructive } from '@/components/confirm';
import { Screen } from '@/components/finance';
import { AmountField, ChipPicker, Field, SwatchPicker, TextField } from '@/components/form';
import { Button, IconButton, type IconName } from '@/components/ui';
import { formatDate } from '@/domain/dates';
import { amountToInput, parseAmount } from '@/domain/money';
import { SWATCHES } from '@/domain/seed';
import { useCurrency, useData } from '@/store/data';
import { useTheme } from '@/theme/ThemeProvider';

const GOAL_ICONS: { id: IconName; label: string }[] = [
  { id: 'shield', label: 'Khẩn cấp' },
  { id: 'monitor', label: 'Công nghệ' },
  { id: 'map', label: 'Du lịch' },
  { id: 'home', label: 'Nhà' },
  { id: 'truck', label: 'Xe' },
  { id: 'book', label: 'Học tập' },
  { id: 'heart', label: 'Gia đình' },
  { id: 'gift', label: 'Khác' },
];

/** Deadline presets in months from now (0 = none). */
const DEADLINES = [0, 3, 6, 12, 24];

function addMonths(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

export default function GoalForm() {
  const { spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useData((s) => s.data);
  const saveGoal = useData((s) => s.saveGoal);
  const deleteGoal = useData((s) => s.deleteGoal);
  const currency = useCurrency();
  const existing = id ? data.goals.find((g) => g.id === id && !g.deleted) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(existing ? amountToInput(existing.targetAmount, currency) : '');
  const [icon, setIcon] = useState<IconName>((existing?.icon as IconName) ?? 'shield');
  const [color, setColor] = useState(existing?.color ?? SWATCHES[0]);
  const [deadline, setDeadline] = useState<number | undefined>(existing?.deadline);
  const [preset, setPreset] = useState<string | undefined>(existing?.deadline ? undefined : '0');
  const [submitted, setSubmitted] = useState(false);

  const parsed = parseAmount(target, currency);
  const errors = {
    name: !name.trim() ? 'Nhập tên mục tiêu' : null,
    target: !parsed || parsed <= 0 ? 'Nhập số tiền mục tiêu' : null,
  };

  function onSave() {
    setSubmitted(true);
    if (errors.name || errors.target || !parsed) return;
    saveGoal({ id: existing?.id, name: name.trim(), targetAmount: parsed, icon, color, deadline });
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: existing ? 'Sửa mục tiêu' : 'Mục tiêu mới',
          headerLeft: () => <IconButton icon="x" label="Đóng" onPress={() => router.back()} />,
        }}
      />
      <Screen>
        <Field label="Tên mục tiêu" error={submitted ? errors.name : null}>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder="VD: Quỹ khẩn cấp 6 tháng"
            invalid={submitted && !!errors.name}
            maxLength={40}
          />
        </Field>
        <Field label="Số tiền cần đạt" error={submitted ? errors.target : null}>
          <AmountField value={target} onChange={setTarget} currency={currency} invalid={submitted && !!errors.target} />
        </Field>
        <Field label="Thời hạn" hint={deadline ? `Đến ${formatDate(deadline)}` : 'Không giới hạn thời gian'}>
          <ChipPicker
            options={DEADLINES.map((m) => ({ id: String(m), label: m === 0 ? 'Không' : `${m} tháng` }))}
            value={preset}
            onChange={(v) => {
              setPreset(v);
              setDeadline(v === '0' ? undefined : addMonths(Number(v)));
            }}
          />
        </Field>
        <Field label="Biểu tượng">
          <ChipPicker
            options={GOAL_ICONS.map((g) => ({ ...g, icon: g.id, color }))}
            value={icon}
            onChange={(v) => setIcon(v as IconName)}
          />
        </Field>
        <Field label="Màu">
          <SwatchPicker colors={SWATCHES} value={color} onChange={setColor} />
        </Field>
        <Button title="Lưu mục tiêu" icon="check" onPress={onSave} />
        {existing && (
          <Button
            title="Xóa mục tiêu"
            icon="trash-2"
            variant="danger"
            style={{ marginTop: spacing.md }}
            onPress={() =>
              confirmDestructive(
                'Xóa mục tiêu?',
                'Toàn bộ tiền đã tiết kiệm sẽ được trả về các ví nguồn.',
                'Xóa',
                () => {
                  deleteGoal(existing.id);
                  router.dismissTo('/savings');
                },
              )
            }
          />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
