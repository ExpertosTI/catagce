'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PortalLayout from '../../../../components/PortalLayout';
import { apiFetch } from '../../../../lib/api';

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    apiFetch(`/portal/invoices/${params.id}`).then(setInvoice).catch(console.error);
  }, [params.id]);

  if (!invoice) return <PortalLayout><p className="text-slate-500">Cargando...</p></PortalLayout>;

  return (
    <PortalLayout>
      <Link href="/portal/invoices" className="text-blue-700 text-sm hover:underline">← Volver a facturas</Link>
      <div className="mt-4 flex flex-wrap justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{invoice.reference}</h2>
          <p className="text-slate-500">{invoice.invoiceType === 'credit' ? 'Factura a crédito' : 'Factura al contado'}</p>
        </div>
        <span className="badge-blue capitalize h-fit">{invoice.status}</span>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <div className="card p-4"><p className="text-xs text-slate-500">Total</p><p className="text-xl font-bold">${parseFloat(invoice.totalAmount).toFixed(2)}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Pagado</p><p className="text-xl font-bold text-emerald-700">${parseFloat(invoice.paidAmount || '0').toFixed(2)}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Pendiente</p><p className="text-xl font-bold text-amber-700">${(parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || '0')).toFixed(2)}</p></div>
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="p-4 border-b bg-slate-50 font-medium">Productos</div>
        <table className="w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left p-4">Producto</th>
              <th className="text-right p-4">Cant.</th>
              <th className="text-right p-4">Despachado</th>
              <th className="text-right p-4">Pendiente</th>
              <th className="text-right p-4">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item: any) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="p-4">{item.productName} <span className="text-slate-400">({item.productSku})</span></td>
                <td className="p-4 text-right">{item.quantity}</td>
                <td className="p-4 text-right text-emerald-700">{item.dispatchedQty}</td>
                <td className="p-4 text-right text-amber-700">{item.quantity - item.dispatchedQty}</td>
                <td className="p-4 text-right">${parseFloat(item.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invoice.payments?.length > 0 && (
        <div className="card mt-6 overflow-hidden">
          <div className="p-4 border-b bg-slate-50 font-medium">Abonos registrados</div>
          <ul className="divide-y divide-slate-100">
            {invoice.payments.map((p: any) => (
              <li key={p.id} className="p-4 flex justify-between text-sm">
                <span>{new Date(p.paidAt).toLocaleDateString('es-PA')} · {p.method} {p.reference && `(${p.reference})`}</span>
                <span className="font-medium text-emerald-700">${parseFloat(p.amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PortalLayout>
  );
}
