/**
 * Pure finance calculations. Balances are always *derived* from the ledger
 * (initial balance + transactions + savings movements) rather than stored,
 * so they can never drift out of sync with the history.
 */
import { monthKey, monthRange, shiftMonth } from './dates';
import type { AppData, Category, ID, Minor, Syncable } from './types';

export const alive = <T extends Syncable>(items: T[]): T[] => items.filter((i) => !i.deleted);

export function walletBalance(data: AppData, walletId: ID): Minor {
  const wallet = data.wallets.find((w) => w.id === walletId);
  let balance = wallet?.initialBalance ?? 0;
  for (const t of alive(data.transactions)) {
    if (t.kind === 'income' && t.walletId === walletId) balance += t.amount;
    else if (t.kind === 'expense' && t.walletId === walletId) balance -= t.amount;
    else if (t.kind === 'transfer') {
      if (t.walletId === walletId) balance -= t.amount;
      if (t.toWalletId === walletId) balance += t.amount;
    }
  }
  for (const s of alive(data.savingsEntries)) {
    if (s.walletId === walletId) balance -= s.amount;
  }
  return balance;
}

/** Spendable money across all active wallets (excludes money parked in savings goals). */
export function totalBalance(data: AppData): Minor {
  return alive(data.wallets)
    .filter((w) => !w.archived)
    .reduce((sum, w) => sum + walletBalance(data, w.id), 0);
}

export function goalSaved(data: AppData, goalId: ID): Minor {
  return alive(data.savingsEntries)
    .filter((s) => s.goalId === goalId)
    .reduce((sum, s) => sum + s.amount, 0);
}

export function totalSaved(data: AppData): Minor {
  return alive(data.goals).reduce((sum, g) => sum + goalSaved(data, g.id), 0);
}

export interface PeriodSummary {
  income: Minor;
  expense: Minor;
  net: Minor;
  /** Net amount moved into savings goals during the period. */
  saved: Minor;
}

/** Transfers between own wallets are excluded — they are neither income nor spending. */
export function periodSummary(data: AppData, from: number, to: number): PeriodSummary {
  let income = 0;
  let expense = 0;
  for (const t of alive(data.transactions)) {
    if (t.occurredAt < from || t.occurredAt >= to) continue;
    if (t.kind === 'income') income += t.amount;
    else if (t.kind === 'expense') expense += t.amount;
  }
  const saved = alive(data.savingsEntries)
    .filter((s) => s.occurredAt >= from && s.occurredAt < to)
    .reduce((sum, s) => sum + s.amount, 0);
  return { income, expense, net: income - expense, saved };
}

export function monthSummary(data: AppData, key: string): PeriodSummary {
  const { from, to } = monthRange(key);
  return periodSummary(data, from, to);
}

export interface CategorySlice {
  category: Category;
  amount: Minor;
  share: number;
}

export function byCategory(data: AppData, kind: 'expense' | 'income', from: number, to: number): CategorySlice[] {
  const totals = new Map<ID, Minor>();
  for (const t of alive(data.transactions)) {
    if (t.kind !== kind || !t.categoryId || t.occurredAt < from || t.occurredAt >= to) continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  const cats = new Map(data.categories.map((c) => [c.id, c]));
  return [...totals.entries()]
    .flatMap(([id, amount]) => {
      const category = cats.get(id);
      return category ? [{ category, amount, share: sum ? amount / sum : 0 }] : [];
    })
    .sort((a, b) => b.amount - a.amount);
}

export interface MonthPoint extends PeriodSummary {
  key: string;
}

/** Income/expense for the `count` months ending at `endKey` (oldest first). */
export function monthlyTrend(data: AppData, endKey: string, count: number): MonthPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const key = shiftMonth(endKey, i - count + 1);
    return { key, ...monthSummary(data, key) };
  });
}

export interface BudgetUsage {
  budgetId: ID;
  category: Category;
  limit: Minor;
  spent: Minor;
  ratio: number;
}

export function budgetUsage(data: AppData, key: string): BudgetUsage[] {
  const { from, to } = monthRange(key);
  const spentByCat = new Map(byCategory(data, 'expense', from, to).map((s) => [s.category.id, s.amount]));
  const cats = new Map(data.categories.map((c) => [c.id, c]));
  return alive(data.budgets).flatMap((b) => {
    const category = cats.get(b.categoryId);
    if (!category || category.deleted) return [];
    const spent = spentByCat.get(b.categoryId) ?? 0;
    return [
      { budgetId: b.id, category, limit: b.monthlyLimit, spent, ratio: b.monthlyLimit ? spent / b.monthlyLimit : 0 },
    ];
  });
}

/** Average daily spend this month, projected to month end — a simple burn-rate forecast. */
export function projectedMonthExpense(data: AppData, now = Date.now()): Minor {
  const { from, to } = monthRange(monthKey(now));
  // Whole month, not [from, now]: `now` may be a mount-time snapshot older than fresh entries.
  const { expense } = periodSummary(data, from, to);
  const daysElapsed = Math.max(1, Math.ceil((now - from) / 86_400_000));
  const daysInMonth = Math.round((to - from) / 86_400_000);
  return Math.round((expense / daysElapsed) * daysInMonth);
}

export function walletHasActivity(data: AppData, walletId: ID): boolean {
  return (
    alive(data.transactions).some((t) => t.walletId === walletId || t.toWalletId === walletId) ||
    alive(data.savingsEntries).some((s) => s.walletId === walletId)
  );
}

/** Monthly amount needed to reach a savings target by its deadline (null if no deadline or already reached). */
export function monthlyNeeded(remaining: Minor, deadline?: number, now = Date.now()): Minor | null {
  if (!deadline || remaining <= 0) return null;
  const months = Math.max(1, Math.ceil((deadline - now) / (30.44 * 86_400_000)));
  return Math.ceil(remaining / months);
}
