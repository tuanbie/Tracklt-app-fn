/**
 * Web build (used for quick previews / demo recordings): native Google Sign-In is
 * not available, so Drive sync is disabled. Same API surface as googleAuth.ts.
 */
import type { User } from '@react-native-google-signin/google-signin';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export class AuthError extends Error {
  constructor(
    message: string,
    public kind: 'cancelled' | 'no-play-services' | 'not-signed-in' | 'unknown',
  ) {
    super(message);
  }
}

const unsupported = () => new AuthError('Đồng bộ Google Drive chỉ hỗ trợ trên ứng dụng Android/iOS.', 'unknown');

export function configureGoogle() {}
export async function signIn(): Promise<User> {
  throw unsupported();
}
export async function restoreSession(): Promise<User | null> {
  return null;
}
export async function signOut() {}
export async function getAccessToken(): Promise<string> {
  throw unsupported();
}
export async function invalidateToken(_token: string) {}
