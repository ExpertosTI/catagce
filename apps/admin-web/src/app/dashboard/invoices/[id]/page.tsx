'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '../../../../components/DashboardLayout';
import { InvoiceDetailView } from '../../../../components/InvoiceDetailView';
import { LoadingState } from '../../../../components/LoadingState';
import { apiFetch } from '../../../../lib/api';
import { InvoiceDetail } from '../../../../lib/invoice-utils';

export default function AdminInvoiceDetailPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const openPayment = searchParams.get('abono') === '1';
  const printReceipt = searchParams.get('receipt') === '1';
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
        <div className="executive-card p-8 text-center text-slate-500">❌ {error}</div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <LoadingState emoji="🧾" message="Cargando factura..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <InvoiceDetailView
        invoice={invoice}
        backHref="/dashboard/invoices"
        canManagePayments
        initialShowPayment={openPayment}
        initialPrintReceipt={printReceipt}
        onInvoiceUpdated={(updated) => setInvoice(updated)}
      />
    </DashboardLayout>
  );
}
