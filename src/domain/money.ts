import type { CurrencyCode, Minor } from './types';

export const CURRENCIES: Record<CurrencyCode, { decimals: number; label: string; locale: string }> = {
  VND: { decimals: 0, label: 'Việt Nam Đồng (₫)', locale: 'vi-VN' },
  USD: { decimals: 2, label: 'US Dollar ($)', locale: 'en-US' },
  EUR: { decimals: 2, label: 'Euro (€)', locale: 'de-DE' },
};

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: CurrencyCode, compact: boolean) {
  const key = `${currency}:${compact}`;
  let f = formatters.get(key);
  if (!f) {
    const { decimals, locale } = CURRENCIES[currency];
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: compact ? 0 : decimals,
      maximumFractionDigits: compact ? 1 : decimals,
      ...(compact ? { notation: 'compact' as const } : null),
    });
    formatters.set(key, f);
  }
  return f;
}

export function toMajor(amount: Minor, currency: CurrencyCode): number {
  return amount / 10 ** CURRENCIES[currency].decimals;
}

export function formatMoney(
  amount: Minor,
  currency: CurrencyCode,
  opts?: { compact?: boolean; signed?: boolean },
): string {
  const text = formatter(currency, !!opts?.compact).format(toMajor(Math.abs(amount), currency));
  if (amount < 0) return `-${text}`;
  if (opts?.signed && amount > 0) return `+${text}`;
  return text;
}

/**
 * Parses user input into minor units. Accepts both "," and "." as the decimal
 * separator for currencies that have decimals; for VND every non-digit is ignored
 * (so "1.250.000" → 1250000). Returns null when nothing valid was entered.
 */
export function parseAmount(text: string, currency: CurrencyCode): Minor | null {
  const { decimals } = CURRENCIES[currency];
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (decimals === 0) {
    const digits = trimmed.replace(/\D/g, '');
    return digits ? Number(digits) : null;
  }

  const normalized = trimmed.replace(/[^\d.,]/g, '').replace(',', '.');
  const [whole = '', frac = '', ...rest] = normalized.split('.');
  if (rest.length || (!whole && !frac)) return null;
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return Number(whole || '0') * 10 ** decimals + Number(fracPadded);
}

/** Groups digits while typing so large VND amounts stay readable ("1250000" → "1.250.000"). */
export function formatAmountInput(text: string, currency: CurrencyCode): string {
  if (CURRENCIES[currency].decimals > 0) return text.replace(/[^\d.,]/g, '');
  const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Inverse of parseAmount, for pre-filling edit forms. */
export function amountToInput(amount: Minor, currency: CurrencyCode): string {
  const { decimals } = CURRENCIES[currency];
  if (decimals === 0) return formatAmountInput(String(amount), currency);
  return (amount / 10 ** decimals).toFixed(decimals);
}
