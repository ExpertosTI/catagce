'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { InvoiceDetailView } from '../../../../components/InvoiceDetailView';
import { apiFetch } from '../../../../lib/api';
import { InvoiceDetail } from '../../../../lib/invoice-utils';

export default function AdminInvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState('');

  function load() {
    apiFetch<InvoiceDetail>(`/invoices/${params.id}`)
      .then((data) => setInvoice({
        ...data,
        clientName: data.client?.name ?? data.clientName,
      }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo cargar la factura'));
  }

  useEffect(load, [params.id]);

  if (error) {
    return (
      <DashboardLayout>
        <PageHeader title="Factura no encontrada" />
        <div className="card p-8 text-center text-slate-500">{error}</div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-32 bg-slate-100 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <InvoiceDetailView
        invoice={invoice}
        backHref="/dashboard/invoices"
        canManagePayments
        onInvoiceUpdated={(updated) => setInvoice(updated)}
      />
    </DashboardLayout>
  );
}
