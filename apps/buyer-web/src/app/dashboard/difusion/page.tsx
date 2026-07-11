'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Radio, Plus, Users, Play, Pause, List, MessageCircle, RotateCcw, Copy, Pencil } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ImagePicker } from '@/components/ImagePicker';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';

type ListRow = { id: string; name: string; description?: string; members?: Array<{ id: string; name: string; phone: string }> };
type CampaignJob = { id: string; phone: string; contactName?: string; status: string; error?: string };
type Campaign = {
  id: string;
  name: string;
  status: string;
  messageText: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  listId?: string;
  delayMinSec?: number;
  delayMaxSec?: number;
  list?: { id?: string; name: string };
  stats: { total: number; sent: number; pending: number; failed: number };
  jobs?: CampaignJob[];
};
type Contact = { id: string; name: string; phone: string };

const emptyForm = {
  listId: '', name: '', messageText: '', mediaUrls: [] as string[], delayMinSec: 45, delayMaxSec: 90,
};

function parseMediaUrls(raw?: string | null, urls?: string[]): string[] {
  if (urls?.length) return urls;
  if (!raw?.trim()) return [];
  const value = raw.trim();
  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch { /* ignore */ }
  }
  return [value];
}

export default function DifusionPage() {
  const { ensureAuth, onApiError } = useRequireAuth();
  const [tab, setTab] = useState<'lists' | 'campaigns'>('lists');
  const [lists, setLists] = useState<ListRow[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState('');
  const [newListName, setNewListName] = useState('');
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [campaignForm, setCampaignForm] = useState(emptyForm);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [waStatus, setWaStatus] = useState<{ instance?: string; state?: string; connected?: boolean; ready?: boolean } | null>(null);

  const refresh = useCallback(async () => {
    if (!ensureAuth()) return;
    try {
      const [l, c, ct, wa] = await Promise.all([
        apiFetch<ListRow[]>('/broadcast/lists'),
        apiFetch<Campaign[]>('/broadcast/campaigns'),
        apiFetch<Contact[]>('/contacts'),
        apiFetch<{ instance?: string; state?: string; connected?: boolean; ready?: boolean }>('/auth/whatsapp/status').catch(() => null),
      ]);
      setLists(l);
      setCampaigns(c);
      setContacts(ct);
      if (wa) setWaStatus(wa);
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err));
    }
  }, [ensureAuth, onApiError]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const running = campaigns.some((c) => c.status === 'running');
    if (!running) return;
    const timer = setInterval(() => { refresh(); }, 5000);
    return () => clearInterval(timer);
  }, [campaigns, refresh]);

  const closeCampaignForm = () => {
    setShowCampaignForm(false);
    setEditingId(null);
    setCampaignForm(emptyForm);
  };

  const openNewCampaign = () => {
    setError('');
    setEditingId(null);
    setCampaignForm(emptyForm);
    setShowCampaignForm(true);
  };

  const openEditCampaign = (c: Campaign) => {
    setError('');
    if (c.status === 'running') {
      setError('Pausa la campaña antes de editarla');
      return;
    }
    setEditingId(c.id);
    setCampaignForm({
      listId: c.listId || c.list?.id || '',
      name: c.name,
      messageText: c.messageText,
      mediaUrls: parseMediaUrls(c.mediaUrl, c.mediaUrls),
      delayMinSec: c.delayMinSec ?? 45,
      delayMaxSec: c.delayMaxSec ?? 90,
    });
    setShowCampaignForm(true);
    setTab('campaigns');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    await apiFetch('/broadcast/lists', { method: 'POST', body: JSON.stringify({ name: newListName }) });
    setNewListName('');
    refresh();
  };

  const addToList = async (listId: string) => {
    const members = contacts
      .filter((c) => selectedContacts.has(c.phone))
      .map((c) => ({ phone: c.phone, name: c.name, buyerContactId: c.id.startsWith('manual') ? undefined : c.id }));
    if (!members.length) return;
    await apiFetch(`/broadcast/lists/${listId}/members`, {
      method: 'POST',
      body: JSON.stringify({ members }),
    });
    setSelectedContacts(new Set());
    refresh();
  };

  const saveCampaign = async () => {
    if (!campaignForm.listId || !campaignForm.name.trim() || !campaignForm.messageText.trim()) {
      setError('Completa lista, nombre y mensaje');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        listId: campaignForm.listId,
        name: campaignForm.name,
        messageText: campaignForm.messageText,
        mediaUrls: campaignForm.mediaUrls,
        delayMinSec: campaignForm.delayMinSec,
        delayMaxSec: campaignForm.delayMaxSec,
      };
      if (editingId) {
        await apiFetch(`/broadcast/campaigns/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/broadcast/campaigns', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      closeCampaignForm();
      setTab('campaigns');
      await refresh();
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const duplicateCampaign = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setError('');
    try {
      const copy = await apiFetch<Campaign>(`/broadcast/campaigns/${id}/duplicate`, { method: 'POST' });
      await refresh();
      openEditCampaign(copy);
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err));
    }
  };

  const startCampaign = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await apiFetch(`/broadcast/campaigns/${id}/start`, { method: 'POST' });
    refresh();
  };

  const pauseCampaign = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await apiFetch(`/broadcast/campaigns/${id}/pause`, { method: 'POST' });
    refresh();
  };

  const retryFailed = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await apiFetch(`/broadcast/campaigns/${id}/retry-failed`, { method: 'POST' });
    refresh();
  };

  return (
    <DashboardLayout>
      <div className="mb-4 p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Radio className="w-6 h-6 text-[#25D366]" />
          Difusión WhatsApp
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Envía mensajes a <strong>varios contactos</strong> con pausa automática (45–90s entre cada uno) para evitar bloqueos de WhatsApp.
          No es lo mismo que el <Link href="/dashboard/whatsapp" className="text-[#00D1FF] underline">Inbox</Link> (conversaciones 1 a 1).
        </p>
        {waStatus && (
          <p className={`text-xs mt-2 ${waStatus.connected || waStatus.state === 'open' ? 'text-green-400' : 'text-amber-400'}`}>
            WhatsApp: instancia <strong>{waStatus.instance || '—'}</strong>
            {waStatus.state ? ` · estado ${waStatus.state}` : ''}
            {!(waStatus.connected || waStatus.state === 'open') && ' · revisa Evolution (Connected)'}
          </p>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="flex gap-2 mb-6">
        {(['lists', 'campaigns'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              tab === t ? 'bg-[#25D366] text-black' : 'bg-white/5 text-gray-400'
            }`}
          >
            {t === 'lists' ? 'Listas' : 'Campañas'}
          </button>
        ))}
      </div>

      {tab === 'lists' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Nueva lista, ej: Clientes VIP"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
            />
            <button type="button" onClick={createList} className="px-4 py-3 rounded-xl bg-[#00D1FF] text-black font-bold">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {lists.map((list) => (
            <div key={list.id} className="glass rounded-2xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    <List className="w-4 h-4 text-[#FF8A00]" /> {list.name}
                  </h3>
                  <p className="text-xs text-gray-500">{list.members?.length || 0} contactos</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedList(selectedList === list.id ? null : list.id)}
                  className="text-xs px-3 py-1 rounded-lg bg-white/10"
                >
                  {selectedList === list.id ? 'Cerrar' : 'Agregar contactos'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {(list.members || []).slice(0, 8).map((m) => (
                  <span key={m.id} className="text-xs px-2 py-1 rounded-full bg-white/5">{m.name}</span>
                ))}
                {(list.members?.length || 0) > 8 && (
                  <span className="text-xs text-gray-500">+{(list.members?.length || 0) - 8} más</span>
                )}
              </div>

              {selectedList === list.id && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-500 mb-2">Selecciona contactos de la app:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1 mb-3">
                    {contacts.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedContacts.has(c.phone)}
                          onChange={() => {
                            setSelectedContacts((prev) => {
                              const n = new Set(prev);
                              if (n.has(c.phone)) n.delete(c.phone); else n.add(c.phone);
                              return n;
                            });
                          }}
                        />
                        {c.name} — {c.phone}
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addToList(list.id)}
                    className="w-full py-2 rounded-xl bg-[#25D366] text-black text-sm font-bold"
                  >
                    <Users className="w-4 h-4 inline mr-1" /> Agregar a lista
                  </button>
                </div>
              )}
            </div>
          ))}

          {lists.length === 0 && (
            <p className="text-center text-gray-500 py-8">Crea tu primera lista de difusión arriba.</p>
          )}
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={openNewCampaign}
            className="w-full py-3 rounded-xl bg-[#FF8A00] text-black font-bold flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" /> Nueva campaña
          </button>

          {showCampaignForm && (
            <div className="glass rounded-2xl p-4 space-y-3 border border-[#FF8A00]/30">
              <div className="flex items-center gap-2 text-sm font-bold text-[#FF8A00]">
                <Pencil className="w-4 h-4" />
                {editingId ? 'Editar campaña' : 'Nueva campaña'}
              </div>
              <select
                value={campaignForm.listId}
                onChange={(e) => setCampaignForm({ ...campaignForm, listId: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
              >
                <option value="">Selecciona lista</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.members?.length || 0})</option>
                ))}
              </select>
              <input
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                placeholder="Nombre campaña"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
              />
              <textarea
                value={campaignForm.messageText}
                onChange={(e) => setCampaignForm({ ...campaignForm, messageText: e.target.value })}
                placeholder="Mensaje a enviar..."
                rows={4}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
              />
              <ImagePicker
                multiple
                max={8}
                values={campaignForm.mediaUrls}
                onChangeMany={(urls) => setCampaignForm({ ...campaignForm, mediaUrls: urls })}
                label="Fotos"
              />
              <div className="flex gap-2 text-sm">
                <label className="flex-1">Pausa min (s)
                  <input type="number" value={campaignForm.delayMinSec} onChange={(e) => setCampaignForm({ ...campaignForm, delayMinSec: Number(e.target.value) })} className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2" />
                </label>
                <label className="flex-1">Pausa max (s)
                  <input type="number" value={campaignForm.delayMaxSec} onChange={(e) => setCampaignForm({ ...campaignForm, delayMaxSec: Number(e.target.value) })} className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2" />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveCampaign}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-[#25D366] text-black font-bold disabled:opacity-60"
                >
                  {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear'}
                </button>
                <button type="button" onClick={closeCampaignForm} className="px-4 py-2 text-gray-400">Cancelar</button>
              </div>
            </div>
          )}

          {campaigns.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => openEditCampaign(c)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openEditCampaign(c); }}
              className={`glass rounded-2xl p-4 cursor-pointer transition-colors hover:border-[#00D1FF]/30 ${
                editingId === c.id ? 'border border-[#FF8A00]/40' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold flex items-center gap-2">
                    {c.name}
                    <span className="text-[10px] font-normal text-gray-500">tocar para editar</span>
                  </h3>
                  <p className="text-xs text-gray-500">{c.list?.name} · {c.status}</p>
                  <p className="text-sm text-gray-400 mt-2 line-clamp-2">{c.messageText}</p>
                  <p className="text-xs mt-2 text-[#00D1FF]">
                    {c.stats.sent}/{c.stats.total} enviados · {c.stats.pending} pendientes · {c.stats.failed} fallidos
                  </p>
                  {(c.jobs || []).filter((j) => j.status === 'failed').map((j) => (
                    <p key={j.id} className="text-xs mt-1 text-red-400">
                      {j.contactName || j.phone}: {j.error || 'Error desconocido'}
                    </p>
                  ))}
                  {(c.jobs || []).filter((j) => j.status === 'pending').slice(0, 3).map((j) => (
                    <p key={j.id} className="text-xs mt-1 text-gray-500">
                      Pendiente: {j.contactName || j.phone}
                    </p>
                  ))}
                </div>
                <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => duplicateCampaign(c.id, e)}
                    className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-white"
                    title="Duplicar campaña"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {c.stats.failed > 0 && (
                    <button type="button" onClick={(e) => retryFailed(c.id, e)} className="p-2 rounded-lg bg-white/10 text-[#00D1FF]" title="Reintentar fallidos">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  {c.status !== 'running' && c.status !== 'completed' && (
                    <button type="button" onClick={(e) => startCampaign(c.id, e)} className="p-2 rounded-lg bg-[#25D366] text-black" title="Iniciar">
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  {c.status === 'running' && (
                    <button type="button" onClick={(e) => pauseCampaign(c.id, e)} className="p-2 rounded-lg bg-[#FF8A00] text-black" title="Pausar">
                      <Pause className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {campaigns.length === 0 && !showCampaignForm && (
            <p className="text-center text-gray-500 py-8">Crea una campaña para enviar a tu lista con pausa automática.</p>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
