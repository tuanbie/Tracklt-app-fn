import { mergeData, mergeRecords, pruneTombstones, TOMBSTONE_TTL_MS } from '../merge';
import { migrate, UnsupportedSchemaError } from '../migrate';
import { createInitialData } from '../seed';
import type { Syncable } from '../types';

const rec = (
  id: string,
  updatedAt: number,
  extra: Record<string, unknown> = {},
): Syncable & Record<string, unknown> => ({
  id,
  createdAt: 1,
  updatedAt,
  ...extra,
});

describe('mergeRecords', () => {
  it('keeps the newest version of each record and unions the rest', () => {
    const local = [rec('a', 5, { v: 'local' }), rec('b', 1)];
    const remote = [rec('a', 3, { v: 'remote' }), rec('c', 1)];
    const out = mergeRecords(local, remote);
    expect(out.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(out.find((r) => r.id === 'a')).toMatchObject({ v: 'local' });
  });

  it('propagates deletions via tombstones', () => {
    const out = mergeRecords([rec('a', 1)], [rec('a', 2, { deleted: true })]);
    expect(out[0].deleted).toBe(true);
  });

  it('is deterministic on ties (remote wins)', () => {
    const out = mergeRecords([rec('a', 1, { v: 'l' })], [rec('a', 1, { v: 'r' })]);
    expect(out[0]).toMatchObject({ v: 'r' });
  });
});

describe('mergeData', () => {
  it('does not duplicate seeded default categories across devices', () => {
    const merged = mergeData(createInitialData(), createInitialData());
    expect(merged.categories.length).toBe(createInitialData().categories.length);
    expect(merged.wallets.length).toBe(1);
  });

  it('is commutative for disjoint edits', () => {
    const a = createInitialData();
    const b = createInitialData();
    a.wallets.push({
      id: 'w_a',
      name: 'A',
      type: 'bank',
      initialBalance: 0,
      color: '#000',
      createdAt: 10,
      updatedAt: 10,
    });
    b.wallets.push({
      id: 'w_b',
      name: 'B',
      type: 'bank',
      initialBalance: 0,
      color: '#000',
      createdAt: 11,
      updatedAt: 11,
    });
    expect(mergeData(a, b).wallets).toEqual(mergeData(b, a).wallets);
  });
});

describe('pruneTombstones', () => {
  it('drops only old tombstones', () => {
    const d = createInitialData();
    const now = 10 * TOMBSTONE_TTL_MS;
    d.wallets = [rec('old', 0, { deleted: true }), rec('new', now - 1000, { deleted: true }), rec('live', 0)] as never;
    expect(pruneTombstones(d, now).wallets.map((w) => w.id)).toEqual(['new', 'live']);
  });
});

describe('migrate', () => {
  it('fills missing collections', () => {
    const d = migrate({ schemaVersion: 1, meta: { currency: 'USD', updatedAt: 1 }, wallets: [] });
    expect(d.transactions).toEqual([]);
    expect(d.meta.currency).toBe('USD');
  });

  it('refuses data from a newer app version', () => {
    expect(() => migrate({ schemaVersion: 99 })).toThrow(UnsupportedSchemaError);
  });
});
