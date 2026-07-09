'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Radio, CheckCircle2, AlertCircle } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { BroadcastNav } from '../../../components/BroadcastNav';
import { LoadingState } from '../../../components/LoadingState';
import { apiFetch } from '../../../lib/api';
import { PAGE } from '../../../lib/page-titles';

type Campaign = {
  id: string;
  name: string;
  status: string;
  listName: string;
  stats: { total: number; sent: number; pending: number; failed: number };
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  running: 'Enviando',
  paused: 'Pausada',
  completed: 'Completada',
};

export default function BroadcastPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [health, setHealth] = useState<{ whatsapp?: boolean; ready?: boolean }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Campaign[]>('/broadcast/campaigns'),
      apiFetch<{ whatsapp?: boolean; ready?: boolean }>('/broadcast/status'),
    ])
      .then(([c, h]) => { setCampaigns(c); setHealth(h); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const running = campaigns.filter((c) => c.status === 'running');

  const waReady = health.whatsapp ?? health.ready;

  return (
    <DashboardLayout>
      <PageHeader
        title={PAGE.broadcast.title}
        subtitle={PAGE.broadcast.subtitle}
        action={(
          <Link
            href="/dashboard/broadcast/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
          >
            <Radio size={16} /> Nueva
          </Link>
        )}
      />

      <BroadcastNav />

      <div className={`rounded-xl p-4 mb-4 flex items-start gap-3 ${
        waReady ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
      }`}>
        {waReady
          ? <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
          : <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />}
        <div>
          <p className="font-semibold text-sm">WhatsApp</p>
          <p className="text-sm text-gray-600">
            {waReady ? 'Conectado — listo para enviar' : 'No disponible — contacte al administrador del sistema'}
          </p>
        </div>
      </div>

      {loading ? <LoadingState /> : (
        <>
          {running.length > 0 && (
            <div className="mb-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">En curso</h3>
              {running.map((c) => {
                const pct = c.stats.total ? Math.round((c.stats.sent / c.stats.total) * 100) : 0;
                return (
                  <Link
                    key={c.id}
                    href={`/dashboard/broadcast/${c.id}`}
                    className="block bg-white rounded-xl border p-4 hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <strong className="text-sm">{c.name}</strong>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">enviando</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{c.stats.sent}/{c.stats.total} enviados · {c.listName}</p>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="bg-white rounded-xl border divide-y">
            {campaigns.length === 0 ? (
              <p className="p-8 text-center text-gray-500 text-sm">
                Sin campañas aún. Cree contactos, una lista y luego una difusión.
              </p>
            ) : campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/broadcast/${c.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.listName} · {c.stats.sent}/{c.stats.total}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {STATUS_LABEL[c.status] || c.status}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <Link
        href="/dashboard/broadcast/contacts"
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:bg-emerald-700 z-30"
        aria-label="Contactos"
      >
        <Plus size={24} />
      </Link>
    </DashboardLayout>
  );
}
