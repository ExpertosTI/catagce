'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { apiFetch } from '../../../../lib/api';
import { PAGE } from '../../../../lib/page-titles';
import { useAppDialog } from '../../../../components/AppDialogProvider';

export default function NewClientPage() {
  const router = useRouter();
  const { alert } = useAppDialog();
  const [form, setForm] = useState({ name: '', email: '', phone: '', taxId: '', address: '', creditLimit: 50000, creditDays: 30 });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/clients', { method: 'POST', body: JSON.stringify(form) });
      router.push('/dashboard/clients');
    } catch (err: unknown) {
      await alert({ title: 'Error', message: err instanceof Error ? err.message : 'Error al crear cliente', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader emoji={PAGE.clientsNew.emoji} title={PAGE.clientsNew.title} subtitle={PAGE.clientsNew.subtitle} />
      <form onSubmit={submit} className="form-card max-w-lg space-y-4">
        <FormField label="Nombre">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
        </FormField>
        <FormField label="Correo electrónico">
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" required />
        </FormField>
        <FormField label="Teléfono (WhatsApp)">
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="8095551234" />
        </FormField>
        <FormField label="RNC / Cédula">
          <input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="input" />
        </FormField>
        <FormField label="Dirección">
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Límite de crédito">
            <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} className="input" />
          </FormField>
          <FormField label="Días de crédito">
            <input type="number" value={form.creditDays} onChange={(e) => setForm({ ...form, creditDays: Number(e.target.value) })} className="input" />
          </FormField>
        </div>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Creando...' : 'Crear cliente'}
        </button>
      </form>
    </DashboardLayout>
  );
}
