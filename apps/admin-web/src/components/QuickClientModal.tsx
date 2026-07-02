'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { FormField } from './FormField';
import { apiFetch } from '../lib/api';

type Client = { id: string; name: string; code: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
};

export function QuickClientModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const client = await apiFetch<Client>('/clients', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onCreated(client);
      setForm({ name: '', email: '', phone: '' });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="quick-client-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="quick-client-title" className="text-lg font-bold text-slate-900">Nuevo cliente</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <FormField label="Nombre">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="Correo electrónico">
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </FormField>
          <FormField label="Teléfono (WhatsApp)">
            <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="8095551234" />
          </FormField>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
              {loading ? 'Guardando...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
