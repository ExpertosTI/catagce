'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getApiKey, getToken } from '@/lib/api';
import { handleAuthError } from '@/lib/auth-errors';

export function useRequireAuth() {
  const router = useRouter();

  const ensureAuth = useCallback((): boolean => {
    if (!getApiKey() && !getToken()) {
      router.push('/login');
      return false;
    }
    return true;
  }, [router]);

  const onApiError = useCallback((err: unknown): boolean => {
    return handleAuthError(err, router);
  }, [router]);

  return { ensureAuth, onApiError };
}
