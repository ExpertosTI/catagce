'use client';

import { useState } from 'react';
import { GoogleAuthProvider, OAuthProvider, signInWithPopup } from 'firebase/auth';
import { publicFetch, setAuth } from '../lib/api';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';

type Props = {
  companySlug: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  onNewUser?: () => void;
};

export function OAuthButtons({ companySlug, onSuccess, onError, onNewUser }: Props) {
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);

  if (!isFirebaseConfigured()) return null;

  async function exchangeToken(idToken: string, displayName?: string | null) {
    const res = await publicFetch<{
      token: string;
      client: object;
      isNewUser?: boolean;
    }>('/auth/client/oauth', {
      method: 'POST',
      body: JSON.stringify({ idToken, companySlug, displayName: displayName || undefined }),
    });
    setAuth(res.token, res.client);
    if (res.isNewUser) onNewUser?.();
    onSuccess();
  }

  async function signInWithGoogle() {
    setLoading('google');
    onError('');
    try {
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      await exchangeToken(idToken, result.user.displayName);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') return;
      onError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google');
    } finally {
      setLoading(null);
    }
  }

  async function signInWithApple() {
    setLoading('apple');
    onError('');
    try {
      const auth = getFirebaseAuth();
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await exchangeToken(idToken, result.user.displayName);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user') return;
      onError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Apple');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-800 transition disabled:opacity-50"
      >
        <GoogleIcon />
        {loading === 'google' ? 'Conectando...' : 'Continuar con Google'}
      </button>
      <button
        type="button"
        onClick={signInWithApple}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-slate-900 bg-slate-900 hover:bg-black text-sm font-medium text-white transition disabled:opacity-50"
      >
        <AppleIcon />
        {loading === 'apple' ? 'Conectando...' : 'Continuar con Apple'}
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.083 36 24 36c-5.522 0-10-4.478-10-10s4.478-10 10-10c2.761 0 5.257 1.12 7.07 2.93l5.657-5.657C33.64 6.053 29.082 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c2.761 0 5.257 1.12 7.07 2.93l5.657-5.657C33.64 6.053 29.082 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.083 0 9.617-1.947 13.111-5.115l-6.057-4.908C29.083 36 24.514 36 24 36c-5.066 0-9.52-3.291-11.065-7.887l-6.54 5.036C9.5 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.057 4.908C36.909 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
