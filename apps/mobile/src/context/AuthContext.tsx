import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuthSession, clearSession, loadSession, loginClient, loginStaff, saveSession,
} from '../api/client';
import { COMPANY_SLUG } from '../config';

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string, mode: 'client' | 'staff') => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession().then(setSession).finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    async signIn(email, password, mode) {
      const res = mode === 'staff'
        ? await loginStaff(email, password)
        : await loginClient(email, password, COMPANY_SLUG);

      const next: AuthSession = {
        token: res.token,
        type: mode,
        name: res.user.name,
        email: res.user.email,
        company: res.company,
      };
      await saveSession(next);
      setSession(next);
    },
    async signOut() {
      await clearSession();
      setSession(null);
    },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
