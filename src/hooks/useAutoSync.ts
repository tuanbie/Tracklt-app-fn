import { useEffect } from 'react';
import { AppState } from 'react-native';

import { restoreSession } from '@/services/googleAuth';
import { syncNow, useSync } from '@/services/sync';
import { useData } from '@/store/data';
import { usePrefs } from '@/store/prefs';

const DEBOUNCE_MS = 4000;

/** Restores the Google session, then syncs on launch, on foreground, and a few seconds after edits. */
export function useAutoSync() {
  const autoSync = usePrefs((s) => s.autoSync);
  const signedIn = useSync((s) => !!s.account);
  const revision = useData((s) => s.revision);

  useEffect(() => {
    if (!signedIn) return;
    restoreSession().then((user) => {
      if (user) useSync.getState().setAccount({ email: user.user.email, name: user.user.name, photo: user.user.photo });
      if (autoSync) syncNow();
    });
    // Only on sign-in state change / launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || !autoSync) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNow();
    });
    return () => sub.remove();
  }, [signedIn, autoSync]);

  useEffect(() => {
    if (!signedIn || !autoSync || revision === useSync.getState().syncedRevision) return;
    const t = setTimeout(syncNow, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [revision, signedIn, autoSync]);
}
