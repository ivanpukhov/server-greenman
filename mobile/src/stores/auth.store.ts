import { create } from 'zustand';
import {
  clearAdminSession,
  clearSession,
  readAdminSession,
  readSession,
  writeAdminSession,
  writeSession,
  type AdminSecureSession,
  type SecureSession,
} from '@/lib/storage/secure';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const ADMIN_TTL_MS = 24 * 60 * 60 * 1000;

export type AdminProfile = AdminSecureSession['profile'];

type AuthState = {
  isReady: boolean;
  token: string | null;
  userId: number | null;
  isAuthenticated: boolean;

  adminToken: string | null;
  adminUserId: number | null;
  adminProfile: AdminProfile | null;
  isAdmin: boolean;

  bootstrap: () => Promise<void>;
  login: (session: { token: string; userId: number }) => Promise<void>;
  logout: () => Promise<void>;

  adminLogin: (payload: { token: string; userId: number; profile: AdminProfile }) => Promise<void>;
  adminLogout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  isReady: false,
  token: null,
  userId: null,
  isAuthenticated: false,

  adminToken: null,
  adminUserId: null,
  adminProfile: null,
  isAdmin: false,

  bootstrap: async () => {
    const [userSession, adminSession] = await Promise.all([readSession(), readAdminSession()]);

    const userValid = !!userSession && Date.now() - userSession.authAt < TWO_DAYS_MS;
    const adminValid = !!adminSession && Date.now() - adminSession.authAt < ADMIN_TTL_MS;

    if (!userValid && userSession) await clearSession();
    if (!adminValid && adminSession) await clearAdminSession();

    set({
      isReady: true,
      token: userValid ? userSession!.token : null,
      userId: userValid ? userSession!.userId : null,
      isAuthenticated: userValid,
      adminToken: adminValid ? adminSession!.token : null,
      adminUserId: adminValid ? adminSession!.userId : null,
      adminProfile: adminValid ? adminSession!.profile : null,
      isAdmin: adminValid,
    });
  },

  login: async ({ token, userId }) => {
    const record: SecureSession = { token, userId, authAt: Date.now() };
    await writeSession(record);
    set({ token, userId, isAuthenticated: true });
  },

  logout: async () => {
    await clearSession();
    set({ token: null, userId: null, isAuthenticated: false });
  },

  adminLogin: async ({ token, userId, profile }) => {
    const record: AdminSecureSession = { token, userId, authAt: Date.now(), profile };
    await writeAdminSession(record);
    set({ adminToken: token, adminUserId: userId, adminProfile: profile, isAdmin: true });
  },

  adminLogout: async () => {
    await clearAdminSession();
    set({ adminToken: null, adminUserId: null, adminProfile: null, isAdmin: false });
  },
}));
