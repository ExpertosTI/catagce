'use client';

import { useEffect, useState } from 'react';
import { Plus, Download } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { BroadcastNav } from '../../../../components/BroadcastNav';
import { LoadingState } from '../../../../components/LoadingState';
import { apiFetch } from '../../../../lib/api';
import { PAGE } from '../../../../lib/page-titles';
import { useToast } from '../../../../components/ToastProvider';

type Contact = { id: string; name: string; phone: string };

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return phone;
}

export default function BroadcastContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [importing, setImporting] = useState(false);
  const { showToast } = useToast();

  function load() {
    apiFetch<Contact[]>('/broadcast/contacts')
      .then(setContacts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/broadcast/contacts', {
        method: 'POST',
        body: JSON.stringify({ name, phone }),
      });
      setName(''); setPhone(''); setShowForm(false);
      showToast('Contacto guardado');
      load();
    } catch {
      showToast('No se pudo guardar (¿teléfono duplicado?)', 'error');
    }
  }

  async function importClients() {
    setImporting(true);
    try {
      const res = await apiFetch<{ imported: number }>('/broadcast/contacts/import-clients', { method: 'POST' });
      showToast(`${res.imported} contactos importados desde clientes`);
      load();
    } catch {
      showToast('Error al importar', 'error');
    } finally {
      setImporting(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title={PAGE.broadcastContacts.title} subtitle={PAGE.broadcastContacts.subtitle} />

      <BroadcastNav />

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
        >
          <Plus size={16} /> Agregar
        </button>
        <button
          type="button"
          onClick={importClients}
          disabled={importing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50"
        >
          <Download size={16} /> {importing ? '…' : 'Importar clientes'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addContact} className="bg-white rounded-xl border p-4 mb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input
              className="w-full px-3 py-2 border rounded-lg text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
            <input
              className="w-full px-3 py-2 border rounded-lg text-sm"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="8095550000"
              required
            />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold">
            Guardar
          </button>
        </form>
      )}

      {loading ? <LoadingState /> : (
        <div className="bg-white rounded-xl border divide-y">
          {contacts.length === 0 ? (
            <p className="p-8 text-center text-gray-500 text-sm">Sin contactos</p>
          ) : contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold text-sm">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-gray-500">{formatPhone(c.phone)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
