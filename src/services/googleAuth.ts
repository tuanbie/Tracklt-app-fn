import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
  type User,
} from '@react-native-google-signin/google-signin';

/**
 * `drive.file` only grants access to files TrackIt itself creates, so the user's
 * other Drive content is never readable by the app. The data file is visible in
 * the user's Drive under "TrackIt/" so they can inspect or back it up.
 */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let configured = false;

export function configureGoogle() {
  if (configured) return;
  GoogleSignin.configure({
    scopes: [DRIVE_SCOPE],
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  configured = true;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public kind: 'cancelled' | 'no-play-services' | 'not-signed-in' | 'unknown',
  ) {
    super(message);
  }
}

export async function signIn(): Promise<User> {
  configureGoogle();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) throw new AuthError('Bạn đã hủy đăng nhập.', 'cancelled');
    // Older sign-ins may predate the Drive scope — ask for it explicitly.
    if (!res.data.scopes.includes(DRIVE_SCOPE)) {
      const granted = await GoogleSignin.addScopes({ scopes: [DRIVE_SCOPE] });
      if (!granted || !isSuccessResponse(granted)) {
        throw new AuthError('Cần cấp quyền Google Drive để đồng bộ dữ liệu.', 'cancelled');
      }
      return granted.data;
    }
    return res.data;
  } catch (e) {
    if (e instanceof AuthError) throw e;
    if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new AuthError('Thiết bị chưa có Google Play Services.', 'no-play-services');
    }
    throw new AuthError('Không thể đăng nhập Google. Vui lòng thử lại.', 'unknown');
  }
}

/** Restores the session on app start without showing UI. */
export async function restoreSession(): Promise<User | null> {
  configureGoogle();
  if (!GoogleSignin.hasPreviousSignIn()) return null;
  try {
    const res = await GoogleSignin.signInSilently();
    return res.type === 'success' ? res.data : null;
  } catch {
    return null;
  }
}

export async function signOut() {
  configureGoogle();
  await GoogleSignin.signOut();
}

export async function getAccessToken(): Promise<string> {
  configureGoogle();
  if (!GoogleSignin.getCurrentUser()) {
    const restored = await restoreSession();
    if (!restored) throw new AuthError('Chưa đăng nhập Google.', 'not-signed-in');
  }
  const { accessToken } = await GoogleSignin.getTokens();
  return accessToken;
}

/** Call after a 401 so the next getTokens() fetches a fresh token. */
export async function invalidateToken(token: string) {
  await GoogleSignin.clearCachedAccessToken(token);
}
