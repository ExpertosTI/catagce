'use client';

import { useEffect, useState } from 'react';
import PortalLayout from '../../../../components/PortalLayout';
import { InvoiceDetailView } from '../../../../components/InvoiceDetailView';
import { apiFetch } from '../../../../lib/api';
import { InvoiceDetail } from '../../../../lib/invoice-utils';

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<InvoiceDetail>(`/portal/invoices/${params.id}`)
      .then((data) => setInvoice({
        ...data,
        clientName: data.client?.name ?? data.clientName,
      }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo cargar la factura'));
  }, [params.id]);

  if (error) {
    return (
      <PortalLayout>
        <div className="card p-8 text-center text-slate-500">{error}</div>
      </PortalLayout>
    );
  }

  if (!invoice) {
    return (
      <PortalLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-32 bg-slate-100 rounded-xl" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <InvoiceDetailView invoice={invoice} backHref="/portal/invoices" />
    </PortalLayout>
  );
}
