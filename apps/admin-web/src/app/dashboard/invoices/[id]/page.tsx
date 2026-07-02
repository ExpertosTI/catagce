'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../../../components/DashboardLayout';
import { InvoiceDetailView } from '../../../../components/InvoiceDetailView';
import { apiFetch } from '../../../../lib/api';
import { InvoiceDetail } from '../../../../lib/invoice-utils';

export default function AdminInvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);

  useEffect(() => {
    apiFetch<InvoiceDetail>(`/invoices/${params.id}`)
      .then((data) => setInvoice({
        ...data,
        clientName: data.client?.name ?? data.clientName,
      }))
      .catch(console.error);
  }, [params.id]);

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
      <InvoiceDetailView invoice={invoice} backHref="/dashboard/invoices" />
    </DashboardLayout>
  );
}
