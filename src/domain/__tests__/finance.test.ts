import {
  budgetUsage,
  byCategory,
  goalSaved,
  monthSummary,
  projectedMonthExpense,
  totalBalance,
  walletBalance,
} from '../finance';
import { createInitialData } from '../seed';
import type { AppData, Transaction } from '../types';

const OCT = new Date(2026, 9, 5).getTime();
const SEP = new Date(2026, 8, 20).getTime();

function tx(p: Partial<Transaction> & Pick<Transaction, 'id' | 'kind' | 'amount'>): Transaction {
  return { walletId: 'wal_cash', note: '', occurredAt: OCT, createdAt: 1, updatedAt: 1, ...p };
}

function fixture(): AppData {
  const d = createInitialData();
  d.wallets[0].initialBalance = 1_000_000;
  d.wallets.push({
    id: 'wal_bank',
    name: 'Bank',
    type: 'bank',
    initialBalance: 5_000_000,
    color: '#000',
    createdAt: 1,
    updatedAt: 1,
  });
  d.transactions = [
    tx({ id: 't1', kind: 'income', amount: 10_000_000, walletId: 'wal_bank', categoryId: 'cat_salary' }),
    tx({ id: 't2', kind: 'expense', amount: 200_000, categoryId: 'cat_food' }),
    tx({ id: 't3', kind: 'expense', amount: 300_000, categoryId: 'cat_food', occurredAt: SEP }),
    tx({ id: 't4', kind: 'transfer', amount: 2_000_000, walletId: 'wal_bank', toWalletId: 'wal_cash' }),
    tx({ id: 't5', kind: 'expense', amount: 999_999, categoryId: 'cat_food', deleted: true }),
  ];
  d.goals = [
    { id: 'g1', name: 'Laptop', targetAmount: 30_000_000, color: '#000', icon: 'monitor', createdAt: 1, updatedAt: 1 },
  ];
  d.savingsEntries = [
    {
      id: 's1',
      goalId: 'g1',
      walletId: 'wal_bank',
      amount: 3_000_000,
      note: '',
      occurredAt: OCT,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 's2',
      goalId: 'g1',
      walletId: 'wal_bank',
      amount: -500_000,
      note: '',
      occurredAt: OCT,
      createdAt: 1,
      updatedAt: 1,
    },
  ];
  d.budgets = [{ id: 'b1', categoryId: 'cat_food', monthlyLimit: 400_000, createdAt: 1, updatedAt: 1 }];
  return d;
}

describe('balances', () => {
  it('derives wallet balances from the ledger, ignoring deleted records', () => {
    const d = fixture();
    // 1,000,000 - 200,000 - 300,000 + 2,000,000 (transfer in)
    expect(walletBalance(d, 'wal_cash')).toBe(2_500_000);
    // 5,000,000 + 10,000,000 - 2,000,000 (transfer out) - 2,500,000 (net to savings)
    expect(walletBalance(d, 'wal_bank')).toBe(10_500_000);
    expect(totalBalance(d)).toBe(13_000_000);
    expect(goalSaved(d, 'g1')).toBe(2_500_000);
  });

  it('excludes archived wallets from the total', () => {
    const d = fixture();
    d.wallets[1].archived = true;
    expect(totalBalance(d)).toBe(2_500_000);
  });
});

describe('statistics', () => {
  it('summarises a month without counting transfers as income/expense', () => {
    const s = monthSummary(fixture(), '2026-10');
    expect(s).toEqual({ income: 10_000_000, expense: 200_000, net: 9_800_000, saved: 2_500_000 });
  });

  it('groups spending by category with shares', () => {
    const d = fixture();
    d.transactions.push(tx({ id: 't6', kind: 'expense', amount: 600_000, categoryId: 'cat_bills' }));
    const from = new Date(2026, 9, 1).getTime();
    const to = new Date(2026, 10, 1).getTime();
    const slices = byCategory(d, 'expense', from, to);
    expect(slices.map((s) => [s.category.id, s.amount, s.share])).toEqual([
      ['cat_bills', 600_000, 0.75],
      ['cat_food', 200_000, 0.25],
    ]);
  });

  it('tracks budget usage for the month', () => {
    const [u] = budgetUsage(fixture(), '2026-10');
    expect(u.spent).toBe(200_000);
    expect(u.ratio).toBe(0.5);
  });
});

describe('projectedMonthExpense', () => {
  it('projects month spend from the burn rate so far', () => {
    const d = fixture(); // 200,000 spent in Oct (t2)
    const now = new Date(2026, 9, 10, 12).getTime(); // 10 days into a 31-day month
    expect(projectedMonthExpense(d, now)).toBe(Math.round((200_000 / 10) * 31));
  });

  it('includes entries recorded after the `now` snapshot', () => {
    const d = fixture();
    const now = new Date(2026, 9, 1, 1).getTime();
    d.transactions.push(tx({ id: 'late', kind: 'expense', amount: 100_000, categoryId: 'cat_food', occurredAt: now + 3_600_000 }));
    expect(projectedMonthExpense(d, now)).toBeGreaterThan(0);
  });
});
