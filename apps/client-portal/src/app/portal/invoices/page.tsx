'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PortalLayout from '../../../components/PortalLayout';
import { apiFetch } from '../../../lib/api';

type Invoice = {
  id: string;
  reference: string;
  invoiceType: string;
  status: string;
  totalAmount: string;
  paidAmount: string;
  issuedAt: string;
};

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    apiFetch<Invoice[]>('/portal/invoices').then(setInvoices).catch(console.error);
  }, []);

  return (
    <PortalLayout>
      <h2 className="text-2xl font-bold">Mis facturas</h2>
      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b">
            <tr>
              <th className="text-left p-4">Referencia</th>
              <th className="text-left p-4">Tipo</th>
              <th className="text-left p-4">Estado</th>
              <th className="text-right p-4">Total</th>
              <th className="text-right p-4">Pagado</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4 font-medium">{inv.reference}</td>
                <td className="p-4">{inv.invoiceType === 'credit' ? 'Crédito' : 'Contado'}</td>
                <td className="p-4"><span className="badge-blue capitalize">{inv.status}</span></td>
                <td className="p-4 text-right">${parseFloat(inv.totalAmount).toFixed(2)}</td>
                <td className="p-4 text-right">${parseFloat(inv.paidAmount || '0').toFixed(2)}</td>
                <td className="p-4 text-right">
                  <Link href={`/portal/invoices/${inv.id}`} className="text-blue-700 hover:underline text-sm">Detalle</Link>
                </td>
              </tr>
            ))}
            {!invoices.length && (
              <tr><td colSpan={6} className="p-10 text-center text-slate-500">Sin facturas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PortalLayout>
  );
}
