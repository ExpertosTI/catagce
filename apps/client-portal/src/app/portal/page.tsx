'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PortalLayout from '../../components/PortalLayout';
import { apiFetch } from '../../lib/api';

export default function PortalHomePage() {
  const router = useRouter();

  useEffect(() => {
    apiFetch('/portal/me')
      .then(() => router.replace('/portal/invoices'))
      .catch(() => { window.location.href = '/login'; });
  }, [router]);

  return (
    <PortalLayout>
      <p className="text-slate-500">Cargando facturas...</p>
    </PortalLayout>
  );
}
