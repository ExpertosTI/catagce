'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pencil, ArrowLeft, Plus, Phone, Mail, MapPin } from 'lucide-react';
import DashboardLayout, { PageHeader, SectionTitle, ActionButton } from '../../../../components/DashboardLayout';
import { InvoiceCard } from '../../../../components/InvoiceCard';
import { FormField } from '../../../../components/FormField';
import { apiFetch } from '../../../../lib/api';
import { clientStatusLabel, formatMoney } from '../../../../lib/labels';
import { PAGE } from '../../../../lib/page-titles';
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
  { key: 'email', label: 'Correo electrónico', type: 'email', required: true },
  { key: 'phone', label: 'Teléfono (WhatsApp)', type: 'tel' },
  { key: 'taxId', label: 'RNC / Cédula' },
  { key: 'address', label: 'Dirección' },
];

const defaultForm = { name: '', email: '', phone: '', taxId: '', address: '', creditLimit: 0, creditDays: 30 };

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'edit' ? 'edit' : 'invoices';
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [form, setForm] = useState(defaultForm);
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
        setForm({
          name: c.name ?? '',
          email: c.email ?? '',
          phone: c.phone ?? '',
          taxId: c.taxId ?? '',
          address: c.address ?? '',
          creditLimit: parseFloat(c.creditLimit || '0'),
          creditDays: c.creditDays ?? 30,
        });
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
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const totalBalance = invoices.reduce((s, i) => s + invoiceBalance(i), 0);

  if (notFound) {
    return (
      <DashboardLayout>
        <PageHeader emoji={PAGE.clientsNotFound.emoji} title={PAGE.clientsNotFound.title} />
        <div className="executive-card p-8 text-center text-slate-500">No se pudo cargar este cliente.</div>
      </DashboardLayout>
    );
  }

  if (loading || !client) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-32 bg-slate-100 rounded-2xl" />
          <div className="h-48 bg-slate-100 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <button type="button" onClick={() => router.push('/dashboard/clients')} className="text-blue-700 text-sm font-medium hover:underline inline-flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> 👥 Volver a clientes
      </button>

      <div className="executive-card mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl font-bold shrink-0">
            {client.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{client.name}</h1>
              <span className={client.status === 'active' ? 'badge-green' : client.status === 'pending' ? 'badge-amber' : 'badge-blue'}>
                {clientStatusLabel[client.status] ?? client.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{client.code}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-slate-600">
              {client.phone && <span className="flex items-center gap-1"><Phone size={14} /> {client.phone}</span>}
              {client.email && <span className="flex items-center gap-1"><Mail size={14} /> {client.email}</span>}
              {client.address && <span className="flex items-center gap-1"><MapPin size={14} /> {client.address}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-500">💳 Crédito</p>
            <p className="text-lg font-bold text-slate-900">{formatMoney(client.creditLimit)}</p>
            {totalBalance > 0 && (
              <p className="text-sm font-semibold text-red-600 mt-1">Pendiente: {formatUsd(totalBalance)}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab('invoices')}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${tab === 'invoices' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500'}`}
        >
          🧾 Facturas ({invoices.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('edit')}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${tab === 'edit' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500'}`}
        >
          ✏️ Editar datos
        </button>
      </div>

      {tab === 'invoices' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <SectionTitle emoji="🧾">Facturas del cliente</SectionTitle>
            <ActionButton href={`/dashboard/invoices/new?clientId=${client.id}`} emoji="📝" label="Nueva factura" />
          </div>

          {invoices.length === 0 ? (
            <div className="executive-card p-10 text-center text-slate-500">
              <p className="text-4xl mb-3" aria-hidden>🧾</p>
              <p className="font-medium">Sin facturas</p>
              <p className="text-sm mt-1">Este cliente aún no tiene comprobantes emitidos</p>
              <Link href={`/dashboard/invoices/new?clientId=${client.id}`} className="btn-subtle btn-subtle-primary mt-4 inline-flex">
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
          <SectionTitle emoji="✏️">Editar datos del cliente</SectionTitle>
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
              <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} className="input" />
            </FormField>
            <FormField label="Días de crédito">
              <input type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: Number(e.target.value) })} className="input" />
            </FormField>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setTab('invoices')} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
