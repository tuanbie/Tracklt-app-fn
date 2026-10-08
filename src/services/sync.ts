/**
 * Offline-first sync: the app always reads/writes local storage; this engine
 * reconciles it with the JSON file on Google Drive.
 *
 *   1. download remote file (if any)  →  2. merge per record (LWW + tombstones)
 *   3. apply merged result locally     →  4. upload merged result
 *
 * Before uploading we re-check the file `version`; if another device wrote in
 * between, we loop and merge again instead of overwriting its changes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mergeData, pruneTombstones } from '@/domain/merge';
import { migrate, UnsupportedSchemaError } from '@/domain/migrate';
import { useData } from '@/store/data';
import { AuthError } from './googleAuth';
import { createDataFile, downloadJson, DriveError, findDataFile, getFileMeta, updateDataFile } from './googleDrive';

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncState {
  account: { email: string; name: string | null; photo: string | null } | null;
  fileId: string | null;
  lastSyncedAt: number | null;
  /** Local `revision` that was last pushed; if it differs, there are unsynced edits. */
  syncedRevision: number;
  status: SyncStatus;
  error: string | null;
  setAccount: (a: SyncState['account']) => void;
  clear: () => void;
}

export const useSync = create<SyncState>()(
  persist(
    (set) => ({
      account: null,
      fileId: null,
      lastSyncedAt: null,
      syncedRevision: -1,
      status: 'idle',
      error: null,
      setAccount: (account) => set({ account }),
      clear: () =>
        set({ account: null, fileId: null, lastSyncedAt: null, syncedRevision: -1, status: 'idle', error: null }),
    }),
    {
      name: 'trackit.sync',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ account, fileId, lastSyncedAt, syncedRevision }) => ({
        account,
        fileId,
        lastSyncedAt,
        syncedRevision,
      }),
    },
  ),
);

export function hasUnsyncedChanges() {
  return useData.getState().revision !== useSync.getState().syncedRevision;
}

function friendlyError(e: unknown): string {
  if (e instanceof AuthError) return e.message;
  if (e instanceof UnsupportedSchemaError)
    return 'Dữ liệu trên Drive được tạo bởi phiên bản TrackIt mới hơn. Hãy cập nhật ứng dụng.';
  if (e instanceof DriveError) {
    if (e.status === 0) return 'Không có kết nối mạng. Dữ liệu vẫn được lưu trên máy.';
    if (e.status === 403) return 'Google Drive từ chối truy cập hoặc đã hết dung lượng.';
    return 'Đồng bộ Google Drive thất bại. Vui lòng thử lại.';
  }
  return 'Đã có lỗi không mong muốn khi đồng bộ.';
}

let inFlight: Promise<boolean> | null = null;

/** Runs one sync. Concurrent calls share the same run. Resolves true on success. */
export function syncNow(): Promise<boolean> {
  if (!useSync.getState().account) return Promise.resolve(false);
  inFlight ??= runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(): Promise<boolean> {
  useSync.setState({ status: 'syncing', error: null });
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { fileId } = useSync.getState();
      const remoteFile = fileId ? await getFileMeta(fileId).catch(() => null) : null;
      const file = remoteFile ?? (await findDataFile());

      const localRevision = useData.getState().revision;
      const local = useData.getState().data;
      const merged = file ? pruneTombstones(mergeData(local, migrate(await downloadJson(file.id)))) : local;

      // Abort this round if the file changed while we were merging (another device synced).
      if (file && (await getFileMeta(file.id)).version !== file.version) continue;

      const written = file ? await updateDataFile(file.id, merged) : await createDataFile(merged);

      // Only apply if the user didn't edit locally during the network round-trip;
      // otherwise keep their edits and let the next sync merge them.
      const store = useData.getState();
      if (store.revision === localRevision) {
        store.replaceData(merged);
        useSync.setState({ syncedRevision: localRevision });
      } else {
        store.replaceData(mergeData(merged, store.data));
      }
      useSync.setState({ fileId: written.id, lastSyncedAt: Date.now(), status: 'idle' });
      return true;
    }
    throw new DriveError('Concurrent writes', 409);
  } catch (e) {
    if (__DEV__) console.warn('[sync]', e);
    useSync.setState({ status: 'error', error: friendlyError(e) });
    return false;
  }
}
