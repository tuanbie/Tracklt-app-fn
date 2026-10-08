import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { walletHasActivity } from '@/domain/finance';
import { migrate } from '@/domain/migrate';
import { createInitialData, newId } from '@/domain/seed';
import type {
  AppData,
  Budget,
  CollectionKey,
  CurrencyCode,
  ID,
  SavingsEntry,
  SavingsGoal,
  Syncable,
  Transaction,
  Wallet,
} from '@/domain/types';

/** Input for create/update: id omitted → create. */
type Draft<T extends Syncable> = Omit<T, 'createdAt' | 'updatedAt' | 'id'> & { id?: ID };

interface DataState {
  data: AppData;
  /** Bumped on every local edit; the sync engine compares it to the last synced revision. */
  revision: number;
  hydrated: boolean;

  saveWallet: (w: Draft<Wallet>) => ID;
  /** Hard-deletes an unused wallet, otherwise archives it to preserve history. Returns what happened. */
  removeWallet: (id: ID) => 'deleted' | 'archived';
  saveTransaction: (t: Draft<Transaction>) => ID;
  deleteTransaction: (id: ID) => void;
  saveGoal: (g: Draft<SavingsGoal>) => ID;
  deleteGoal: (id: ID) => void;
  addSavingsEntry: (e: Draft<SavingsEntry>) => ID;
  deleteSavingsEntry: (id: ID) => void;
  saveBudget: (b: Draft<Budget>) => ID;
  deleteBudget: (id: ID) => void;
  setCurrency: (c: CurrencyCode) => void;
  /** Used by sync: replaces data without bumping the revision. */
  replaceData: (data: AppData) => void;
  resetAll: () => void;
}

const PREFIX: Record<CollectionKey, string> = {
  wallets: 'wal',
  categories: 'cat',
  transactions: 'txn',
  goals: 'goal',
  savingsEntries: 'sav',
  budgets: 'bud',
};

export const useData = create<DataState>()(
  persist(
    (set, get) => {
      function upsert<K extends CollectionKey>(key: K, draft: Draft<AppData[K][number]>): ID {
        const now = Date.now();
        const list = get().data[key] as AppData[K][number][];
        const existing = draft.id ? list.find((r) => r.id === draft.id) : undefined;
        const record = {
          ...existing,
          ...draft,
          id: existing?.id ?? newId(PREFIX[key]),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        } as AppData[K][number];
        const next = existing ? list.map((r) => (r.id === record.id ? record : r)) : [...list, record];
        set((s) => ({ data: { ...s.data, [key]: next }, revision: s.revision + 1 }));
        return record.id;
      }

      function tombstone(key: CollectionKey, predicate: (r: Syncable & Record<string, unknown>) => boolean) {
        const now = Date.now();
        set((s) => ({
          data: {
            ...s.data,
            [key]: (s.data[key] as unknown as (Syncable & Record<string, unknown>)[]).map((r) =>
              !r.deleted && predicate(r) ? { ...r, deleted: true, updatedAt: now } : r,
            ),
          },
          revision: s.revision + 1,
        }));
      }

      return {
        data: createInitialData(),
        revision: 0,
        hydrated: false,

        saveWallet: (w) => upsert('wallets', w),
        removeWallet: (id) => {
          if (walletHasActivity(get().data, id)) {
            const w = get().data.wallets.find((x) => x.id === id);
            if (w) upsert('wallets', { ...w, archived: true });
            return 'archived';
          }
          tombstone('wallets', (r) => r.id === id);
          return 'deleted';
        },
        saveTransaction: (t) => upsert('transactions', t),
        deleteTransaction: (id) => tombstone('transactions', (r) => r.id === id),
        saveGoal: (g) => upsert('goals', g),
        deleteGoal: (id) => {
          // Deleting a goal returns its money to the wallets it came from (entries are removed).
          tombstone('savingsEntries', (r) => r.goalId === id);
          tombstone('goals', (r) => r.id === id);
        },
        addSavingsEntry: (e) => upsert('savingsEntries', e),
        deleteSavingsEntry: (id) => tombstone('savingsEntries', (r) => r.id === id),
        saveBudget: (b) => upsert('budgets', b),
        deleteBudget: (id) => tombstone('budgets', (r) => r.id === id),
        setCurrency: (currency) =>
          set((s) => ({ data: { ...s.data, meta: { currency, updatedAt: Date.now() } }, revision: s.revision + 1 })),
        replaceData: (data) => set({ data }),
        resetAll: () => set((s) => ({ data: createInitialData(), revision: s.revision + 1 })),
      };
    },
    {
      name: 'trackit.data',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ data: s.data, revision: s.revision }),
      merge: (persisted, current) => {
        const p = persisted as Partial<Pick<DataState, 'data' | 'revision'>> | undefined;
        return { ...current, revision: p?.revision ?? 0, data: p?.data ? migrate(p.data) : current.data };
      },
      onRehydrateStorage: () => () => useData.setState({ hydrated: true }),
    },
  ),
);

/** Convenience selector for the active currency. */
export const useCurrency = () => useData((s) => s.data.meta.currency);
