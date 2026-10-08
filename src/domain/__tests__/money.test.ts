import { amountToInput, formatAmountInput, parseAmount } from '../money';

describe('parseAmount', () => {
  it('parses VND ignoring separators', () => {
    expect(parseAmount('1.250.000', 'VND')).toBe(1_250_000);
    expect(parseAmount('50000₫', 'VND')).toBe(50_000);
    expect(parseAmount('', 'VND')).toBeNull();
    expect(parseAmount('abc', 'VND')).toBeNull();
  });

  it('parses decimal currencies into minor units without float error', () => {
    expect(parseAmount('12.34', 'USD')).toBe(1234);
    expect(parseAmount('12,3', 'USD')).toBe(1230);
    expect(parseAmount('0.1', 'USD')).toBe(10);
    expect(parseAmount('19.999', 'USD')).toBe(1999);
    expect(parseAmount('1.2.3', 'USD')).toBeNull();
  });
});

describe('input formatting', () => {
  it('groups VND digits while typing', () => {
    expect(formatAmountInput('1250000', 'VND')).toBe('1.250.000');
    expect(formatAmountInput('0012', 'VND')).toBe('12');
  });

  it('round-trips through amountToInput', () => {
    expect(parseAmount(amountToInput(1_250_000, 'VND'), 'VND')).toBe(1_250_000);
    expect(parseAmount(amountToInput(1234, 'USD'), 'USD')).toBe(1234);
  });
});
