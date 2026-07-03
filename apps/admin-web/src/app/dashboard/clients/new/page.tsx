'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { FormField } from '../../../../components/FormField';
import { CurrencyInput } from '../../../../components/CurrencyInput';
import { apiFetch } from '../../../../lib/api';
import { PAGE } from '../../../../lib/page-titles';
import { useAppDialog } from '../../../../components/AppDialogProvider';

export default function NewClientPage() {
  const router = useRouter();
  const { alert } = useAppDialog();
  const [form, setForm] = useState({ name: '', email: '', phone: '', taxId: '', address: '', creditLimit: 50000, creditDays: 30 });
  const [creditDisplay, setCreditDisplay] = useState('50,000.00');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      await alert({ title: 'Datos incompletos', message: 'El nombre es obligatorio', variant: 'info' });
      return;
    }
    if (!form.phone.trim()) {
      await alert({ title: 'Datos incompletos', message: 'El teléfono es obligatorio', variant: 'info' });
      return;
    }
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
      <Link href="/dashboard/clients" className="text-blue-700 text-sm font-semibold hover:underline inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft size={16} /> Volver a clientes
      </Link>
      <form onSubmit={submit} className="form-card max-w-lg space-y-4">
        <FormField label="Nombre *">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required />
        </FormField>
        <FormField label="Teléfono (WhatsApp) *">
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="8095551234" required />
        </FormField>
        <FormField label="Correo electrónico">
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="Opcional" />
        </FormField>
        <FormField label="RNC / Cédula">
          <input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="input" />
        </FormField>
        <FormField label="Dirección">
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
        </FormField>
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
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
            {loading ? 'Creando...' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
