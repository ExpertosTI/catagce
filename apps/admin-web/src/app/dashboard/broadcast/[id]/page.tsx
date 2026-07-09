'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, Send } from 'lucide-react';
import DashboardLayout, { PageHeader } from '../../../../components/DashboardLayout';
import { LoadingState } from '../../../../components/LoadingState';
import { apiFetch } from '../../../../lib/api';
import { PAGE } from '../../../../lib/page-titles';

type Job = {
  id: string;
  contactName: string;
  phone: string;
  status: string;
  scheduledAt: string;
  error?: string | null;
};

type Detail = {
  campaign: { id: string; name: string; status: string; message: string; mediaUrl?: string | null };
  jobs: Job[];
  stats: { total: number; sent: number; pending: number; failed: number };
};

export default function BroadcastDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    apiFetch<Detail>(`/broadcast/campaigns/${id}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function start() {
    await apiFetch(`/broadcast/campaigns/${id}/start`, { method: 'POST' });
    load();
  }

  async function togglePause() {
    const action = data?.campaign.status === 'running' ? 'pause' : 'resume';
    await apiFetch(`/broadcast/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
    load();
  }

  if (loading && !data) return <DashboardLayout><LoadingState /></DashboardLayout>;
  if (!data) return <DashboardLayout><p className="p-8 text-center">No encontrada</p></DashboardLayout>;

  const { campaign, jobs, stats } = data;
  const pct = stats.total ? Math.round((stats.sent / stats.total) * 100) : 0;

  return (
    <DashboardLayout>
      <PageHeader title={PAGE.broadcastDetail.title} subtitle={campaign.name} />

      <Link href="/dashboard/broadcast" className="inline-flex items-center gap-1 text-sm text-emerald-700 mb-4">
        <ArrowLeft size={16} /> Volver
      </Link>

      <div className="bg-white rounded-xl border p-4 mb-4">
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-sm mb-3">
          {campaign.message}
        </div>
        {campaign.mediaUrl && (
          <p className="text-xs text-gray-500 mb-3">📷 {campaign.mediaUrl}</p>
        )}

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {stats.sent}/{stats.total} enviados · {stats.pending} pendientes · {stats.failed} fallidos
        </p>

        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <button
              type="button"
              onClick={start}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
            >
              <Send size={16} /> Iniciar envío
            </button>
          )}
          {(campaign.status === 'running' || campaign.status === 'paused') && (
            <button
              type="button"
              onClick={togglePause}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold"
            >
              {campaign.status === 'running'
                ? <><Pause size={16} /> Pausar</>
                : <><Play size={16} /> Reanudar</>}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border divide-y">
        {jobs.map((j) => (
          <div key={j.id} className="flex items-center gap-3 p-4">
            <div className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-bold ${
              j.status === 'sent' ? 'bg-emerald-500' : j.status === 'failed' ? 'bg-red-500' : 'bg-emerald-700'
            }`}>
              {j.status === 'sent' ? '✓' : j.status === 'failed' ? '!' : '…'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{j.contactName}</p>
              <p className="text-xs text-gray-500">
                {new Date(j.scheduledAt).toLocaleString('es-DO')}
                {j.error && ` · ${j.error}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
