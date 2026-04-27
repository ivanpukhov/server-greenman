import * as SecureStore from 'expo-secure-store';

const KEY = 'gm.session.v1';
const ADMIN_KEY = 'gm.admin_session.v1';

export type SecureSession = {
  token: string;
  userId: number;
  authAt: number;
  phoneNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type AdminSecureSession = {
  token: string;
  userId: number;
  authAt: number;
  profile: {
    fullName: string;
    iin: string;
    phoneNumber: string;
  };
};

export async function readSession(): Promise<SecureSession | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SecureSession;
  } catch {
    return null;
  }
}

export async function writeSession(session: SecureSession): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

export async function readAdminSession(): Promise<AdminSecureSession | null> {
  const raw = await SecureStore.getItemAsync(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSecureSession;
  } catch {
    return null;
  }
}

export async function writeAdminSession(session: AdminSecureSession): Promise<void> {
  await SecureStore.setItemAsync(ADMIN_KEY, JSON.stringify(session));
}

export async function clearAdminSession(): Promise<void> {
  await SecureStore.deleteItemAsync(ADMIN_KEY);
}
