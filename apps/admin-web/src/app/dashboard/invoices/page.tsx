'use client';

import { useEffect, useState } from 'react';
import DashboardLayout, { PageHeader, ActionButton } from '../../../components/DashboardLayout';
import { apiFetch } from '../../../lib/api';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/invoices').then(setInvoices).catch(console.error);
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Facturas" subtitle="Contado y crédito" action={<ActionButton href="/dashboard/invoices/new" label="Nueva factura" />} />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b">
            <tr>
              <th className="text-left p-4">Referencia</th>
              <th className="text-left p-4">Cliente</th>
              <th className="text-left p-4">Tipo</th>
              <th className="text-left p-4">Estado</th>
              <th className="text-right p-4">Total</th>
              <th className="text-right p-4">Pagado</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4 font-medium">{inv.reference}</td>
                <td className="p-4">{inv.clientName}</td>
                <td className="p-4">{inv.invoiceType === 'credit' ? 'Crédito' : 'Contado'}</td>
                <td className="p-4"><span className="badge-blue capitalize">{inv.status}</span></td>
                <td className="p-4 text-right">${parseFloat(inv.totalAmount).toFixed(2)}</td>
                <td className="p-4 text-right">${parseFloat(inv.paidAmount || '0').toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
