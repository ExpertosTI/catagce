'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle, FileText, Loader2, Phone, Mail, XCircle, Package,
} from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { ReportTableCard } from '../../../../components/ReportTableCard';
import { LoadingState } from '../../../../components/LoadingState';
import { apiFetch } from '../../../../lib/api';
import { formatCurrency } from '../../../../lib/currency';
import { presaleStatusLabel } from '../../../../lib/labels';
import { useAppDialog } from '../../../../components/AppDialogProvider';

type PresaleItem = {
  id: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

type PresaleDetail = {
  id: string;
  reference: string;
  status: string;
  totalAmount: string;
  notes?: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  createdAt: string;
  items: PresaleItem[];
  invoiceId?: string | null;
};

export default function PresaleDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { confirm, alert } = useAppDialog();
  const [presale, setPresale] = useState<PresaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'confirm' | 'cancel' | 'convert' | null>(null);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    apiFetch<PresaleDetail>(`/catalogs/presales/${params.id}`)
      .then(setPresale)
      .catch(() => setError('No se pudo cargar la preventa'))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [params.id]);

  async function handleConfirm() {
    const ok = await confirm({
      title: 'Confirmar preventa',
      message: '¿Confirma que acepta este pedido del cliente?',
      confirmLabel: 'Confirmar',
    });
    if (!ok) return;
    setActionLoading('confirm');
    try {
      const updated = await apiFetch<PresaleDetail>(`/catalogs/presales/${params.id}/confirm`, { method: 'PATCH' });
      setPresale(updated);
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo confirmar', variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    const ok = await confirm({
      title: 'Cancelar preventa',
      message: '¿Está seguro de cancelar este pedido?',
      confirmLabel: 'Cancelar preventa',
      variant: 'danger',
    });
    if (!ok) return;
    setActionLoading('cancel');
    try {
      const updated = await apiFetch<PresaleDetail>(`/catalogs/presales/${params.id}/cancel`, { method: 'PATCH' });
      setPresale(updated);
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo cancelar', variant: 'error' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConvert() {
    const ok = await confirm({
      title: 'Convertir a factura',
      message: 'Se emitirá una factura fiscal a crédito con los productos de esta preventa.',
      confirmLabel: 'Emitir factura',
    });
    if (!ok) return;
    setActionLoading('convert');
    try {
      const res = await apiFetch<{ invoice: { id: string } }>(`/catalogs/presales/${params.id}/convert-invoice`, {
        method: 'POST',
        body: JSON.stringify({ invoiceType: 'credit', isFiscal: true, issue: true }),
      });
      router.push(`/dashboard/invoices/${res.invoice.id}`);
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'No se pudo convertir', variant: 'error' });
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message="Cargando preventa..." />
      </DashboardLayout>
    );
  }

  if (error || !presale) {
    return (
      <DashboardLayout>
        <div className="executive-card p-8 text-center text-slate-500">{error || 'Preventa no encontrada'}</div>
      </DashboardLayout>
    );
  }

  const statusCls = {
    open: 'badge-amber',
    confirmed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    converted: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
    cancelled: 'bg-slate-100 text-slate-600',
  }[presale.status] ?? 'badge-blue';

  const canConfirm = presale.status === 'open';
  const canCancel = ['open', 'confirmed'].includes(presale.status);
  const canConvert = ['open', 'confirmed'].includes(presale.status);

  return (
    <DashboardLayout>
      <Link href="/dashboard/presales" className="text-blue-700 text-sm font-semibold hover:underline inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft size={16} /> Volver a preventas
      </Link>

      <PageHeader
        title={presale.reference}
        subtitle={`Pedido de ${presale.clientName}`}
        action={(
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusCls}`}>
            {presaleStatusLabel[presale.status] ?? presale.status}
          </span>
        )}
      />

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div className="report-kpi border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total preventa</p>
          <p className="report-kpi-value text-blue-700">{formatCurrency(presale.totalAmount)}</p>
        </div>
        <div className="report-kpi">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Productos</p>
          <p className="report-kpi-value text-slate-800">{presale.items.length}</p>
        </div>
        <div className="report-kpi">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</p>
          <p className="report-kpi-value text-slate-700 text-lg">
            {new Date(presale.createdAt).toLocaleDateString('es-DO')}
          </p>
        </div>
      </div>

      <div className="executive-card mb-5">
        <p className="text-sm font-semibold text-slate-800 mb-2">Cliente</p>
        <Link href={`/dashboard/clients/${presale.clientId}`} className="text-blue-700 font-medium hover:underline">
          {presale.clientName}
        </Link>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
          {presale.clientPhone && (
            <span className="inline-flex items-center gap-1.5"><Phone size={14} /> {presale.clientPhone}</span>
          )}
          {presale.clientEmail && (
            <span className="inline-flex items-center gap-1.5"><Mail size={14} /> {presale.clientEmail}</span>
          )}
        </div>
        {presale.notes && (
          <p className="text-sm text-slate-600 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">{presale.notes}</p>
        )}
      </div>

      <ReportTableCard icon={<Package size={16} className="text-slate-500" />} title="Productos del pedido" subtitle={`${presale.items.length} líneas`}>
        <table className="w-full text-sm min-w-[400px]">
          <thead className="border-b bg-slate-50/50">
            <tr>
              <th className="text-left p-3 font-semibold">Producto</th>
              <th className="text-right p-3 font-semibold">Cant.</th>
              <th className="text-right p-3 font-semibold">Precio</th>
              <th className="text-right p-3 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {presale.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="p-3">
                  <span className="font-medium">{item.productName}</span>
                  {item.productSku && <span className="text-xs text-slate-400 block">{item.productSku}</span>}
                </td>
                <td className="p-3 text-right tabular-nums">{item.quantity}</td>
                <td className="p-3 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                <td className="p-3 text-right font-semibold tabular-nums">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportTableCard>

      <div className="flex flex-wrap gap-2 mt-5">
        {canConfirm && (
          <button type="button" onClick={handleConfirm} disabled={!!actionLoading} className="action-chip action-chip-success disabled:opacity-50">
            {actionLoading === 'confirm' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            <span>Confirmar pedido</span>
          </button>
        )}
        {canConvert && (
          <button type="button" onClick={handleConvert} disabled={!!actionLoading} className="action-chip action-chip-success disabled:opacity-50">
            {actionLoading === 'convert' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            <span>Convertir a factura</span>
          </button>
        )}
        {presale.invoiceId && (
          <Link href={`/dashboard/invoices/${presale.invoiceId}`} className="action-chip">
            <FileText size={16} /><span>Ver factura</span>
          </Link>
        )}
        {canCancel && (
          <button type="button" onClick={handleCancel} disabled={!!actionLoading} className="action-chip text-red-600 border-red-200 hover:border-red-300 disabled:opacity-50">
            {actionLoading === 'cancel' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
            <span>Cancelar</span>
          </button>
        )}
      </div>
    </DashboardLayout>
  );
}
