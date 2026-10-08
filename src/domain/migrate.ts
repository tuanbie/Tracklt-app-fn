import { createInitialData } from './seed';
import { COLLECTION_KEYS, SCHEMA_VERSION, type AppData } from './types';

export class UnsupportedSchemaError extends Error {
  constructor(public version: number) {
    super(`Data schema v${version} is newer than this app (v${SCHEMA_VERSION}). Please update TrackIt.`);
  }
}

/**
 * Validates and upgrades data read from Drive (or old local storage).
 * Add a `case` here whenever SCHEMA_VERSION is bumped.
 */
export function migrate(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid data file');
  const input = raw as Partial<AppData>;
  const version = typeof input.schemaVersion === 'number' ? input.schemaVersion : 1;
  if (version > SCHEMA_VERSION) throw new UnsupportedSchemaError(version);

  const base = createInitialData();
  const data: AppData = {
    ...base,
    ...input,
    schemaVersion: SCHEMA_VERSION,
    meta: { ...base.meta, ...input.meta },
  };
  for (const key of COLLECTION_KEYS) {
    if (!Array.isArray(data[key])) (data as unknown as Record<string, unknown[]>)[key] = [];
  }
  return data;
}
