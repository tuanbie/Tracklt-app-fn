import { SCHEMA_VERSION, type AppData, type Category, type CategoryKind } from './types';

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Default categories use *stable* ids so that two devices starting fresh and then
// syncing end up with one "Ăn uống" category, not two.
const DEFAULT_CATEGORIES: [id: string, kind: CategoryKind, name: string, icon: string, color: string][] = [
  ['cat_food', 'expense', 'Ăn uống', 'coffee', '#E8833A'],
  ['cat_transport', 'expense', 'Di chuyển', 'navigation', '#3B82F6'],
  ['cat_shopping', 'expense', 'Mua sắm', 'shopping-bag', '#D946EF'],
  ['cat_bills', 'expense', 'Hóa đơn', 'file-text', '#EF4444'],
  ['cat_housing', 'expense', 'Nhà ở', 'home', '#8B5CF6'],
  ['cat_health', 'expense', 'Sức khỏe', 'heart', '#EC4899'],
  ['cat_education', 'expense', 'Học tập', 'book-open', '#14B8A6'],
  ['cat_entertainment', 'expense', 'Giải trí', 'film', '#F59E0B'],
  ['cat_other_exp', 'expense', 'Khác', 'more-horizontal', '#64748B'],
  ['cat_salary', 'income', 'Lương', 'briefcase', '#16A34A'],
  ['cat_bonus', 'income', 'Thưởng', 'gift', '#22C55E'],
  ['cat_invest', 'income', 'Đầu tư', 'trending-up', '#0EA5E9'],
  ['cat_other_inc', 'income', 'Thu nhập khác', 'plus-circle', '#64748B'],
];

export function createInitialData(): AppData {
  // createdAt/updatedAt = 0 so any user edit on any device wins over the defaults.
  const categories: Category[] = DEFAULT_CATEGORIES.map(([id, kind, name, icon, color], i) => ({
    id,
    kind,
    name,
    icon,
    color,
    createdAt: i,
    updatedAt: 0,
  }));
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { currency: 'VND', updatedAt: 0 },
    wallets: [
      {
        id: 'wal_cash',
        name: 'Tiền mặt',
        type: 'cash',
        initialBalance: 0,
        color: '#0E7C66',
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    categories,
    transactions: [],
    goals: [],
    savingsEntries: [],
    budgets: [],
  };
}

/** Palette offered when the user picks a colour for a wallet or goal. */
export const SWATCHES = ['#0E7C66', '#3B82F6', '#8B5CF6', '#EC4899', '#E8833A', '#EAB308', '#EF4444', '#64748B'];
