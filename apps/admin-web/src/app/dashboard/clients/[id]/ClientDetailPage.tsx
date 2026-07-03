'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Pencil, ArrowLeft, Plus, Phone, Mail, MapPin, FileText, Wallet } from 'lucide-react';
import DashboardLayout, { SectionTitle } from '../../../../components/DashboardLayout';
import { InvoiceCard } from '../../../../components/InvoiceCard';
import { FormField } from '../../../../components/FormField';
import { CurrencyInput } from '../../../../components/CurrencyInput';
import { LoadingState } from '../../../../components/LoadingState';
import { apiFetch } from '../../../../lib/api';
import { useAppDialog } from '../../../../components/AppDialogProvider';
import { clientStatusLabel } from '../../../../lib/labels';
import { formatCurrency, formatAmount } from '../../../../lib/currency';
import { InvoiceListItem, invoiceBalance, formatUsd } from '../../../../lib/invoice-utils';

type Client = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone?: string;
  taxId?: string;
  address?: string;
  status: string;
  creditLimit: string;
  creditDays: number;
};

const fields: Array<{ key: keyof typeof defaultForm; label: string; type?: string; required?: boolean }> = [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'email', label: 'Correo electrónico', type: 'text' },
  { key: 'phone', label: 'Teléfono (WhatsApp)', type: 'tel', required: true },
  { key: 'taxId', label: 'RNC / Cédula' },
  { key: 'address', label: 'Dirección' },
];

const defaultForm = { name: '', email: '', phone: '', taxId: '', address: '', creditLimit: 0, creditDays: 30 };

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const { alert } = useAppDialog();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'edit' ? 'edit' : 'invoices';
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [creditDisplay, setCreditDisplay] = useState('');
  const [tab, setTab] = useState<'invoices' | 'edit'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      apiFetch<Client>(`/clients/${params.id}`),
      apiFetch<InvoiceListItem[]>(`/invoices?clientId=${params.id}`),
    ])
      .then(([c, inv]) => {
        setClient(c);
        setInvoices(inv);
        const credit = parseFloat(c.creditLimit || '0');
        setForm({
          name: c.name ?? '',
          email: c.email ?? '',
          phone: c.phone ?? '',
          taxId: c.taxId ?? '',
          address: c.address ?? '',
          creditLimit: credit,
          creditDays: c.creditDays ?? 30,
        });
        setCreditDisplay(formatAmount(credit));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [params.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/clients/${params.id}`, { method: 'PATCH', body: JSON.stringify(form) });
      load();
      setTab('invoices');
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'Error al guardar', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const totalBalance = invoices.reduce((s, i) => s + invoiceBalance(i), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + parseFloat(i.totalAmount || '0'), 0);
  const paidCount = invoices.filter((i) => invoiceBalance(i) <= 0.01).length;

  if (notFound) {
    return (
      <DashboardLayout>
        <div className="executive-card p-8 text-center text-slate-500">No se pudo cargar este cliente.</div>
      </DashboardLayout>
    );
  }

  if (loading || !client) {
    return (
      <DashboardLayout>
        <LoadingState message="Cargando cliente..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Link href="/dashboard/clients" className="text-blue-700 text-sm font-semibold hover:underline inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft size={16} /> Volver a clientes
      </Link>

      <div className="executive-card mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shrink-0 shadow-md">
            {client.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{client.name}</h1>
              <span className={client.status === 'active' ? 'badge-green' : client.status === 'pending' ? 'badge-amber' : 'badge-blue'}>
                {clientStatusLabel[client.status] ?? client.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium mt-0.5">{client.code}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-slate-600">
              {client.phone && <span className="flex items-center gap-1.5"><Phone size={14} className="text-slate-400" /> {client.phone}</span>}
              {client.email && <span className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400" /> {client.email}</span>}
              {client.address && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> {client.address}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="report-kpi">
          <p className="text-xs text-slate-500 font-medium">💳 Límite crédito</p>
          <p className="report-kpi-value text-blue-700 text-lg">{formatCurrency(client.creditLimit)}</p>
        </div>
        <div className="report-kpi">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Wallet size={14} /> Pendiente</p>
          <p className={`report-kpi-value ${totalBalance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatUsd(totalBalance)}</p>
        </div>
        <div className="report-kpi">
          <p className="text-xs text-slate-500 font-medium">📈 Facturado</p>
          <p className="report-kpi-value text-slate-800 text-lg">{formatUsd(totalInvoiced)}</p>
        </div>
        <div className="report-kpi">
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><FileText size={14} /> Facturas</p>
          <p className="report-kpi-value text-slate-800">{invoices.length}</p>
          <p className="text-[11px] text-slate-400">{paidCount} pagadas</p>
        </div>
      </div>

      <div className="report-tabs mb-5">
        <button type="button" onClick={() => setTab('invoices')} className={`report-tab ${tab === 'invoices' ? 'report-tab-active' : ''}`}>
          <FileText size={14} className="inline mr-1.5 -mt-0.5" /> Facturas ({invoices.length})
        </button>
        <button type="button" onClick={() => setTab('edit')} className={`report-tab ${tab === 'edit' ? 'report-tab-active' : ''}`}>
          <Pencil size={14} className="inline mr-1.5 -mt-0.5" /> Editar datos
        </button>
      </div>

      {tab === 'invoices' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <SectionTitle icon={<FileText size={16} className="text-blue-600" />}>Facturas del cliente</SectionTitle>
            <Link href={`/dashboard/invoices/new?clientId=${client.id}`} className="btn-primary text-sm">
              <Plus size={16} /> Nueva factura
            </Link>
          </div>

          {invoices.length === 0 ? (
            <div className="executive-card p-10 text-center text-slate-500">
              <p className="font-semibold text-slate-700">Sin facturas</p>
              <p className="text-sm mt-1">Este cliente aún no tiene comprobantes emitidos</p>
              <Link href={`/dashboard/invoices/new?clientId=${client.id}`} className="btn-primary text-sm mt-4 inline-flex">
                <Plus size={15} /> Emitir primera factura
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <InvoiceCard
                  key={inv.id}
                  invoice={inv}
                  detailPath={`/dashboard/invoices/${inv.id}`}
                  fetchPath={`/invoices/${inv.id}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'edit' && (
        <form onSubmit={submit} className="form-card max-w-lg space-y-4">
          <SectionTitle icon={<Pencil size={16} className="text-slate-500" />}>Editar datos del cliente</SectionTitle>
          {fields.map(({ key, label, type, required }) => (
            <FormField key={key} label={label}>
              <input
                type={type ?? 'text'}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="input"
                required={required}
              />
            </FormField>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Límite de crédito">
              <CurrencyInput
                value={creditDisplay}
                onChange={(num, display) => { setForm({ ...form, creditLimit: num }); setCreditDisplay(display); }}
              />
            </FormField>
            <FormField label="Días de crédito">
              <input type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: Number(e.target.value) })} className="input" />
            </FormField>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setTab('invoices')} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
