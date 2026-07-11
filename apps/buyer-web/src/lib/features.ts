'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export type FeatureEntitlement = { enabled: boolean; limit: number | null };

export type MeResponse = {
  user: { id: string; email: string; name?: string; role?: string };
  seller: { id: string; name?: string; planCode: string; planName: string };
  planCode: string;
  planName: string;
  features: Record<string, FeatureEntitlement>;
  isPlatformAdmin: boolean;
};

let cachedMe: MeResponse | null = null;

export function clearMeCache() {
  cachedMe = null;
}

export function useMe() {
  const [me, setMe] = useState<MeResponse | null>(cachedMe);
  const [loading, setLoading] = useState(!cachedMe);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<MeResponse>('/auth/me');
      cachedMe = data;
      setMe(data);
      return data;
    } catch {
      setMe(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedMe) refresh();
  }, [refresh]);

  const hasFeature = (key: string) =>
    Boolean(me?.isPlatformAdmin) || Boolean(me?.features?.[key]?.enabled);

  return { me, loading, refresh, hasFeature, isPlatformAdmin: Boolean(me?.isPlatformAdmin) };
}
