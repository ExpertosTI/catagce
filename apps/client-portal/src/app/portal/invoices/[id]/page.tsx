'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PortalLayout from '../../../../components/PortalLayout';
import { InvoiceDetailView } from '../../../../components/InvoiceDetailView';
import { LoadingState } from '../../../../components/LoadingState';
import { apiFetch } from '../../../../lib/api';
import { InvoiceDetail } from '../../../../lib/invoice-utils';

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<InvoiceDetail>(`/portal/invoices/${params.id}`)
      .then((data) => setInvoice({
        ...data,
        clientName: data.client?.name ?? data.clientName,
      }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo cargar la factura'))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <PortalLayout>
      {loading && <LoadingState message="Cargando factura..." />}
      {!loading && error && (
        <div className="executive-card p-10 text-center text-slate-500">
          <p>{error}</p>
          <Link href="/portal/invoices" className="btn-primary text-sm mt-4 inline-flex">Volver a facturas</Link>
        </div>
      )}
      {!loading && invoice && (
        <InvoiceDetailView invoice={invoice} backHref="/portal/invoices" />
      )}
    </PortalLayout>
  );
}
