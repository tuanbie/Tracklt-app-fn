/**
 * Conflict resolution between the local copy and the copy in Google Drive.
 *
 * Strategy: per-record last-write-wins on `updatedAt`. Deletions are tombstones
 * (`deleted: true`), so a record removed on phone A is not resurrected by phone B.
 * On a tie the remote copy wins, which makes the result identical on every device.
 */
import { COLLECTION_KEYS, type AppData, type Syncable } from './types';

export function mergeRecords<T extends Syncable>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const r of local) byId.set(r.id, r);
  for (const r of remote) {
    const mine = byId.get(r.id);
    if (!mine || r.updatedAt >= mine.updatedAt) byId.set(r.id, r);
  }
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

export function mergeData(local: AppData, remote: AppData): AppData {
  const merged = {
    schemaVersion: Math.max(local.schemaVersion, remote.schemaVersion),
    meta: remote.meta.updatedAt >= local.meta.updatedAt ? remote.meta : local.meta,
  } as AppData;
  for (const key of COLLECTION_KEYS) {
    // Each collection holds a different record type; the generic merge is type-agnostic.
    (merged as unknown as Record<string, Syncable[]>)[key] = mergeRecords<Syncable>(local[key], remote[key]);
  }
  return merged;
}

/** Tombstones older than this are dropped; every device is expected to sync within that window. */
export const TOMBSTONE_TTL_MS = 90 * 86_400_000;

export function pruneTombstones(data: AppData, now = Date.now()): AppData {
  const out = { ...data };
  for (const key of COLLECTION_KEYS) {
    (out as unknown as Record<string, Syncable[]>)[key] = (data[key] as Syncable[]).filter(
      (r) => !r.deleted || now - r.updatedAt < TOMBSTONE_TTL_MS,
    );
  }
  return out;
}
