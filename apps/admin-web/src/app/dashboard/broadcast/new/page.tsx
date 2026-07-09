'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { apiFetch } from '../../../../lib/api';
import { PAGE } from '../../../../lib/page-titles';
import { useToast } from '../../../../components/ToastProvider';

type List = { id: string; name: string; memberCount: number };

export default function NewBroadcastPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [lists, setLists] = useState<List[]>([]);
  const [name, setName] = useState('');
  const [listId, setListId] = useState('');
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [intervalMin, setIntervalMin] = useState(45);
  const [intervalMax, setIntervalMax] = useState(90);
  const [startAt, setStartAt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<List[]>('/broadcast/lists').then(setLists).catch(console.error);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const c = await apiFetch<{ id: string }>('/broadcast/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name,
          listId,
          message,
          mediaUrl: mediaUrl || null,
          mediaType: mediaUrl ? 'image' : null,
          intervalMinSec: intervalMin,
          intervalMaxSec: intervalMax,
          startAt: startAt || null,
        }),
      });
      router.push(`/dashboard/broadcast/${c.id}`);
    } catch {
      showToast('Error al crear campaña', 'error');
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title={PAGE.broadcastNew.title} subtitle={PAGE.broadcastNew.subtitle} />

      <Link href="/dashboard/broadcast" className="inline-flex items-center gap-1 text-sm text-emerald-700 mb-4">
        <ArrowLeft size={16} /> Volver
      </Link>

      <form onSubmit={submit} className="bg-white rounded-xl border p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de la campaña</label>
          <input className="w-full px-3 py-2 border rounded-lg text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Lista de difusión</label>
          <select className="w-full px-3 py-2 border rounded-lg text-sm" value={listId} onChange={(e) => setListId(e.target.value)} required>
            <option value="">Seleccionar…</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l.memberCount})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje</label>
          <textarea
            className="w-full px-3 py-2 border rounded-lg text-sm min-h-[100px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          {message && (
            <div className="mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm max-w-xs ml-auto">
              {message}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">URL de imagen (opcional)</label>
          <input
            className="w-full px-3 py-2 border rounded-lg text-sm"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Pausa entre envíos (segundos)</label>
          <div className="flex gap-2">
            <input className="flex-1 px-3 py-2 border rounded-lg text-sm" type="number" min={15} value={intervalMin} onChange={(e) => setIntervalMin(Number(e.target.value))} />
            <input className="flex-1 px-3 py-2 border rounded-lg text-sm" type="number" min={15} value={intervalMax} onChange={(e) => setIntervalMax(Number(e.target.value))} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Envío cíclico aleatorio entre {intervalMin}s y {intervalMax}s para evitar bloqueos.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Programar inicio (opcional)</label>
          <input className="w-full px-3 py-2 border rounded-lg text-sm" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
        >
          {loading ? 'Creando…' : 'Crear difusión'}
        </button>
      </form>
    </DashboardLayout>
  );
}
