'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from './api';

export type CompanyInfo = { name: string; logoUrl?: string };

let cache: CompanyInfo | null = null;
let inflight: Promise<CompanyInfo> | null = null;

export function useCompany() {
  const [company, setCompany] = useState<CompanyInfo | null>(cache);

  useEffect(() => {
    if (cache) return;
    if (!inflight) {
      inflight = apiFetch<CompanyInfo>('/companies/me').catch(() => ({ name: 'General Home' }));
    }
    inflight.then((c) => {
      cache = c;
      setCompany(c);
    });
  }, []);

  return company;
}
