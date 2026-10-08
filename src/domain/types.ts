/**
 * Core data model. Everything here is serialised as-is into the Google Drive JSON file,
 * so changes must bump SCHEMA_VERSION and add a migration in `migrate.ts`.
 *
 * Money is always stored as an integer in the currency's minor unit
 * (VND → đồng, USD → cents) to avoid floating-point rounding errors.
 */

export const SCHEMA_VERSION = 1;

export type ID = string;
/** Integer amount in minor units. */
export type Minor = number;

/** Fields every synced record carries, used for last-write-wins merging. */
export interface Syncable {
  id: ID;
  createdAt: number;
  updatedAt: number;
  /** Tombstone: kept so a deletion on one device propagates to the others. */
  deleted?: boolean;
}

export type WalletType = 'cash' | 'bank' | 'ewallet' | 'credit';

export interface Wallet extends Syncable {
  name: string;
  type: WalletType;
  initialBalance: Minor;
  color: string;
  archived?: boolean;
}

export type CategoryKind = 'expense' | 'income';

export interface Category extends Syncable {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
}

export type TransactionKind = 'expense' | 'income' | 'transfer';

export interface Transaction extends Syncable {
  kind: TransactionKind;
  /** Always positive; direction is given by `kind`. */
  amount: Minor;
  walletId: ID;
  /** Only for transfers. */
  toWalletId?: ID;
  /** Required for expense/income, absent for transfers. */
  categoryId?: ID;
  note: string;
  occurredAt: number;
}

export interface SavingsGoal extends Syncable {
  name: string;
  targetAmount: Minor;
  deadline?: number;
  color: string;
  icon: string;
}

/** Moves money between a wallet and a savings goal. Positive = deposit, negative = withdrawal. */
export interface SavingsEntry extends Syncable {
  goalId: ID;
  walletId: ID;
  amount: Minor;
  note: string;
  occurredAt: number;
}

/** Monthly spending limit for one expense category. */
export interface Budget extends Syncable {
  categoryId: ID;
  monthlyLimit: Minor;
}

export interface Meta {
  currency: CurrencyCode;
  updatedAt: number;
}

export type CurrencyCode = 'VND' | 'USD' | 'EUR';

export interface AppData {
  schemaVersion: number;
  meta: Meta;
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  goals: SavingsGoal[];
  savingsEntries: SavingsEntry[];
  budgets: Budget[];
}

export type CollectionKey = 'wallets' | 'categories' | 'transactions' | 'goals' | 'savingsEntries' | 'budgets';

export const COLLECTION_KEYS: CollectionKey[] = [
  'wallets',
  'categories',
  'transactions',
  'goals',
  'savingsEntries',
  'budgets',
];
