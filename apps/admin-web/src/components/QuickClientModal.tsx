'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { FormField } from './FormField';
import { apiFetch } from '../lib/api';

type Client = { id: string; name: string; code?: string; phone?: string; taxId?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
  initialName?: string;
};

export function QuickClientModal({ open, onClose, onCreated, initialName = '' }: Props) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', taxId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) setForm((f) => ({ ...f, name: initialName || f.name }));
  }, [open, initialName]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!form.phone.trim()) {
      setError('El teléfono es obligatorio');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const client = await apiFetch<Client>('/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          taxId: form.taxId.trim() || undefined,
        }),
      });
      onCreated(client);
      setForm({ name: '', phone: '', email: '', taxId: '' });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel animate-fade-in" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Nuevo cliente</h3>
            <p className="text-xs text-slate-500 mt-0.5">Solo nombre y teléfono son obligatorios</p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-subtle" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField label="Nombre *">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus placeholder="Ej. Distribuidora El Progreso" />
          </FormField>
          <FormField label="Teléfono / WhatsApp *">
            <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="8095551234" />
          </FormField>
          <FormField label="Correo electrónico">
            <input type="text" inputMode="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Opcional" />
            <p className="form-hint">Opcional — se usa para acceso al portal si lo activa después</p>
          </FormField>
          <FormField label="RNC / Cédula">
            <input className="input" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} placeholder="Opcional — requerido para factura B01" />
          </FormField>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-subtle flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
              {loading ? 'Guardando...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
