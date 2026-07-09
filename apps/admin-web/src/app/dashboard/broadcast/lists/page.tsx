'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { BroadcastNav } from '../../../../components/BroadcastNav';
import { LoadingState } from '../../../../components/LoadingState';
import { apiFetch } from '../../../../lib/api';
import { PAGE } from '../../../../lib/page-titles';
import { useToast } from '../../../../components/ToastProvider';

type Contact = { id: string; name: string; phone: string };
type List = { id: string; name: string; color: string; memberCount: number };

export default function BroadcastListsPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const { showToast } = useToast();

  function load() {
    Promise.all([
      apiFetch<List[]>('/broadcast/lists'),
      apiFetch<Contact[]>('/broadcast/contacts'),
    ])
      .then(([l, c]) => { setLists(l); setContacts(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/broadcast/lists', {
        method: 'POST',
        body: JSON.stringify({ name, contactIds: selected }),
      });
      setName(''); setSelected([]); setShowForm(false);
      showToast('Lista creada');
      load();
    } catch {
      showToast('Error al crear lista', 'error');
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title={PAGE.broadcastLists.title} subtitle={PAGE.broadcastLists.subtitle} />

      <BroadcastNav />

      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full mb-4 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
      >
        <Plus size={16} /> Nueva lista
      </button>

      {showForm && (
        <form onSubmit={createList} className="bg-white rounded-xl border p-4 mb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de la lista</label>
            <input
              className="w-full px-3 py-2 border rounded-lg text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Clientes VIP"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Contactos ({selected.length})
            </label>
            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
              {contacts.map((c) => (
                <label key={c.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{c.name}</span>
                </label>
              ))}
              {!contacts.length && (
                <p className="p-4 text-center text-xs text-gray-500">Agregue contactos primero</p>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={!selected.length}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            Crear lista
          </button>
        </form>
      )}

      {loading ? <LoadingState /> : (
        <div className="space-y-3">
          {lists.length === 0 ? (
            <p className="p-8 text-center text-gray-500 text-sm bg-white rounded-xl border">Sin listas</p>
          ) : lists.map((l) => (
            <div key={l.id} className="bg-white rounded-xl border p-4 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
              <div>
                <p className="font-medium text-sm">{l.name}</p>
                <p className="text-xs text-gray-500">{l.memberCount} contactos</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
