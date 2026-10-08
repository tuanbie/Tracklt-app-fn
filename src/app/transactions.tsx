import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { MonthSwitcher, Screen, TransactionList } from '@/components/finance';
import { Segmented, TextField } from '@/components/form';
import { EmptyState } from '@/components/states';
import { Card } from '@/components/ui';
import { monthKey, monthRange, shiftMonth } from '@/domain/dates';
import { alive } from '@/domain/finance';
import type { TransactionKind } from '@/domain/types';
import { useData } from '@/store/data';
import { useTheme } from '@/theme/ThemeProvider';
import { useNow } from '@/hooks/useNow';

type Filter = 'all' | TransactionKind;

export default function TransactionsScreen() {
  const { spacing } = useTheme();
  const data = useData((s) => s.data);
  const current = monthKey(useNow());
  const [key, setKey] = useState(current);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const { from, to } = monthRange(key);
    const q = query.trim().toLowerCase();
    const catName = new Map(data.categories.map((c) => [c.id, c.name.toLowerCase()]));
    return alive(data.transactions).filter(
      (t) =>
        t.occurredAt >= from &&
        t.occurredAt < to &&
        (filter === 'all' || t.kind === filter) &&
        (!q || t.note.toLowerCase().includes(q) || (t.categoryId && catName.get(t.categoryId)?.includes(q))),
    );
  }, [data, key, filter, query]);

  return (
    <Screen>
      <MonthSwitcher value={key} max={current} onChange={(d) => setKey((k) => shiftMonth(k, d))} />
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Tìm theo ghi chú hoặc danh mục"
        accessibilityLabel="Tìm giao dịch"
        style={{ marginVertical: spacing.md }}
        returnKeyType="search"
      />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Tất cả' },
          { value: 'expense', label: 'Chi' },
          { value: 'income', label: 'Thu' },
          { value: 'transfer', label: 'Chuyển' },
        ]}
      />
      <Card style={{ marginTop: spacing.md }}>
        {items.length === 0 ? (
          <EmptyState
            icon="search"
            title="Không có giao dịch"
            message={query ? 'Không tìm thấy kết quả phù hợp.' : 'Tháng này chưa có giao dịch nào phù hợp bộ lọc.'}
            actionLabel={query ? undefined : 'Thêm giao dịch'}
            onAction={() => router.push('/transaction')}
          />
        ) : (
          <TransactionList items={items} data={data} />
        )}
      </Card>
    </Screen>
  );
}
