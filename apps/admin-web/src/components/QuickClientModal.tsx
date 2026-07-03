'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { FormField } from './FormField';
import { apiFetch, ApiError } from '../lib/api';

type Client = { id: string; name: string; code?: string; phone?: string; taxId?: string; email?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
  initialName?: string;
  initialPhone?: string;
};

export function QuickClientModal({ open, onClose, onCreated, initialName = '', initialPhone = '' }: Props) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', taxId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) {
      setForm({
        name: initialName,
        phone: initialPhone,
        email: '',
        taxId: '',
      });
      setError('');
    }
  }, [open, initialName, initialPhone]);

  if (!open || !mounted) return null;

  async function save() {
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
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'No se pudo crear el cliente';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      save();
    }
  }

  return createPortal(
    <div className="modal-overlay z-[70]" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-panel animate-fade-in" onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Nuevo cliente</h3>
            <p className="text-xs text-slate-500 mt-0.5">Nombre y teléfono son obligatorios</p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-subtle" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <FormField label="Nombre *">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
              placeholder="Ej. Distribuidora El Progreso"
            />
          </FormField>
          <FormField label="Teléfono / WhatsApp *">
            <input
              type="tel"
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="8095551234"
            />
          </FormField>
          <FormField label="Correo electrónico">
            <input
              type="text"
              inputMode="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Opcional"
            />
          </FormField>
          <FormField label="RNC / Cédula">
            <input
              className="input"
              value={form.taxId}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
              placeholder="Opcional — requerido para factura B01"
            />
          </FormField>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-subtle flex-1 justify-center">Cancelar</button>
            <button type="button" onClick={save} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
              {loading ? 'Guardando...' : 'Crear cliente'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
