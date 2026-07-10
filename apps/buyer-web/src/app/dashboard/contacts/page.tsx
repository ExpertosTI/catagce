'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users, Plus, Trash2, Phone, Mail } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';

type Contact = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  orderCount?: number;
};

export default function ContactsPage() {
  const { ensureAuth, onApiError } = useRequireAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!ensureAuth()) return;
    setError('');
    try {
      const data = await apiFetch<Contact[]>('/contacts/managed');
      setContacts(data);
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [ensureAuth, onApiError]);

  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch('/contacts', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({ name: '', phone: '', email: '' });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el contacto'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (contact: Contact) => {
    if (!window.confirm(`¿Eliminar a ${contact.name}?`)) return;
    try {
      await apiFetch(`/contacts/${contact.id}`, { method: 'DELETE' });
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-gray-400">Cargando contactos...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-7 h-7 text-[#00D1FF]" />
          Contactos
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Crea y administra contactos para compartir catálogos, difusión e inbox WhatsApp.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <form onSubmit={create} className="glass rounded-2xl p-4 mb-6 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#00D1FF]" /> Nuevo contacto
        </p>
        <div className="grid sm:grid-cols-3 gap-2">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nombre"
            required
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="8095551234"
            required
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email (opcional)"
            type="email"
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-[#00D1FF] text-black font-bold text-sm disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Agregar contacto'}
        </button>
      </form>

      <div className="space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-gray-400 flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>
                {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
              </p>
              <span className="text-[10px] mt-2 inline-block px-2 py-0.5 rounded-full bg-white/5 text-gray-500">
                {c.source === 'cliente' ? `Cliente · ${c.orderCount} pedido(s)` : 'Manual'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => remove(c)}
              className="p-2 rounded-xl text-red-400 hover:bg-red-500/10"
              title="Eliminar"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      {contacts.length === 0 && (
        <p className="text-center text-gray-500 py-12">No hay contactos. Agrega el primero arriba.</p>
      )}
    </DashboardLayout>
  );
}
