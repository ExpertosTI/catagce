'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Radio, Plus, Users, Play, Pause, List, MessageCircle, RotateCcw, Copy, Pencil, X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ImagePicker } from '@/components/ImagePicker';
import { InstallAppBanner } from '@/components/InstallAppBanner';
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
type Contact = { id: string; name: string; phone: string; source?: string };

const emptyForm = {
  listId: '', name: '', messageText: '', mediaUrls: [] as string[], delayMinSec: 45, delayMaxSec: 90,
};

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return `+1 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return phone;
}

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

function statusColor(status: string) {
  if (status === 'running') return 'text-[#25D366] bg-[#25D366]/15';
  if (status === 'paused') return 'text-[#FF8A00] bg-[#FF8A00]/15';
  if (status === 'completed') return 'text-[#00D1FF] bg-[#00D1FF]/15';
  return 'text-gray-400 bg-white/10';
}

export default function DifusionPage() {
  const { ensureAuth, onApiError } = useRequireAuth();
  const [tab, setTab] = useState<'lists' | 'campaigns'>('campaigns');
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
  const [manualContact, setManualContact] = useState({ name: '', phone: '' });
  const [contactQuery, setContactQuery] = useState('');
  const [addingMembers, setAddingMembers] = useState(false);
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
    setTab('campaigns');
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
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    await apiFetch('/broadcast/lists', { method: 'POST', body: JSON.stringify({ name: newListName }) });
    setNewListName('');
    refresh();
  };

  const addToList = async (listId: string) => {
    const list = lists.find((l) => l.id === listId);
    const already = new Set((list?.members || []).map((m) => m.phone));
    const members = contacts
      .filter((c) => selectedContacts.has(c.phone) && !already.has(c.phone))
      .map((c) => ({
        phone: c.phone,
        name: c.name,
        buyerContactId: c.id.startsWith('wa-') || c.id.startsWith('manual') ? undefined : c.id,
      }));
    if (!members.length) {
      setError(selectedContacts.size ? 'Esos contactos ya están en la lista' : 'Selecciona al menos un contacto');
      return;
    }
    setAddingMembers(true);
    setError('');
    try {
      const res = await apiFetch<{ count?: number }>(`/broadcast/lists/${listId}/members`, {
        method: 'POST',
        body: JSON.stringify({ members }),
      });
      setSelectedContacts(new Set());
      await refresh();
      setError('');
      if (res?.count === 0) setError('No se agregó nadie (ya estaban o número inválido)');
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err, 'No se pudo agregar'));
    } finally {
      setAddingMembers(false);
    }
  };

  const addManualToList = async (listId: string) => {
    const name = manualContact.name.trim();
    const phone = manualContact.phone.trim();
    if (!name || !phone) {
      setError('Nombre y WhatsApp (809/829/849) son obligatorios');
      return;
    }
    setAddingMembers(true);
    setError('');
    try {
      // Crear en contactos si es válido; si ya existe, igual se agrega a la lista
      try {
        await apiFetch('/contacts', {
          method: 'POST',
          body: JSON.stringify({ name, phone }),
        });
      } catch {
        // conflicto / ya existe — ok
      }
      await apiFetch(`/broadcast/lists/${listId}/members`, {
        method: 'POST',
        body: JSON.stringify({ members: [{ name, phone }] }),
      });
      setManualContact({ name: '', phone: '' });
      await refresh();
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err, 'No se pudo agregar el contacto'));
    } finally {
      setAddingMembers(false);
    }
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
      <div className="space-y-3 mb-4">
        <InstallAppBanner compact />
        <div className="rounded-2xl bg-[#25D366]/10 border border-[#25D366]/25 p-3.5">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#25D366] shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-base leading-tight">Difusión WhatsApp</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Pausa 45–90s · no es el{' '}
                <Link href="/dashboard/whatsapp" className="text-[#00D1FF] underline">Inbox</Link>
              </p>
            </div>
          </div>
          {waStatus && (
            <p className={`text-[11px] mt-2 ${waStatus.connected || waStatus.state === 'open' ? 'text-green-400' : 'text-amber-400'}`}>
              {waStatus.instance || '—'}{waStatus.state ? ` · ${waStatus.state}` : ''}
            </p>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

      {/* Segmented control — mobile first */}
      <div className="grid grid-cols-2 gap-1 p-1 mb-4 rounded-2xl bg-white/5 border border-white/10">
        {(['campaigns', 'lists'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`min-h-[44px] rounded-xl text-sm font-bold touch-manipulation ${
              tab === t ? 'bg-[#25D366] text-black' : 'text-gray-400'
            }`}
          >
            {t === 'lists' ? 'Listas' : 'Campañas'}
          </button>
        ))}
      </div>

      {tab === 'lists' && (
        <div className="space-y-3 pb-24">
          <div className="flex gap-2">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Nueva lista…"
              className="flex-1 min-h-[48px] bg-black/40 border border-white/10 rounded-2xl px-4 text-base"
            />
            <button
              type="button"
              onClick={createList}
              className="min-h-[48px] min-w-[48px] rounded-2xl bg-[#00D1FF] text-black font-bold flex items-center justify-center touch-manipulation"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {lists.map((list) => (
            <div key={list.id} className="glass rounded-2xl p-3.5">
              <div className="flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold flex items-center gap-2 text-sm">
                    <List className="w-4 h-4 text-[#FF8A00] shrink-0" />
                    <span className="truncate">{list.name}</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{list.members?.length || 0} contactos</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = selectedList === list.id ? null : list.id;
                    setSelectedList(next);
                    setSelectedContacts(new Set());
                    setContactQuery('');
                    setManualContact({ name: '', phone: '' });
                    setError('');
                  }}
                  className="min-h-[40px] px-3 rounded-xl bg-white/10 text-xs font-semibold shrink-0 touch-manipulation"
                >
                  {selectedList === list.id ? 'Cerrar' : 'Agregar'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {(list.members || []).slice(0, 6).map((m) => (
                  <span key={m.id} className="text-[10px] px-2 py-1 rounded-full bg-white/5">{m.name}</span>
                ))}
                {(list.members?.length || 0) > 6 && (
                  <span className="text-[10px] text-gray-500">+{(list.members?.length || 0) - 6}</span>
                )}
              </div>

              {selectedList === list.id && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-3 relative z-20">
                  <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-300">Agregar por WhatsApp</p>
                    <input
                      value={manualContact.name}
                      onChange={(e) => setManualContact({ ...manualContact, name: e.target.value })}
                      placeholder="Nombre"
                      className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl px-3 text-sm"
                    />
                    <input
                      value={manualContact.phone}
                      onChange={(e) => setManualContact({ ...manualContact, phone: e.target.value })}
                      placeholder="809 / 829 / 849…"
                      inputMode="tel"
                      className="w-full min-h-[44px] bg-black/40 border border-white/10 rounded-xl px-3 text-sm"
                    />
                    <button
                      type="button"
                      disabled={addingMembers}
                      onClick={() => addManualToList(list.id)}
                      className="w-full min-h-[44px] rounded-xl bg-[#00D1FF] text-black text-sm font-bold disabled:opacity-50 touch-manipulation"
                    >
                      {addingMembers ? 'Agregando…' : 'Agregar este contacto'}
                    </button>
                  </div>

                  <input
                    value={contactQuery}
                    onChange={(e) => setContactQuery(e.target.value)}
                    placeholder="Buscar en tus contactos…"
                    className="w-full min-h-[40px] bg-black/40 border border-white/10 rounded-xl px-3 text-sm"
                  />

                  <div className="max-h-48 overflow-y-auto space-y-0.5 overscroll-contain">
                    {(() => {
                      const already = new Set((list.members || []).map((m) => m.phone));
                      const q = contactQuery.trim().toLowerCase();
                      const visible = contacts.filter((c) => {
                        if (already.has(c.phone)) return false;
                        if (!q) return true;
                        return c.name.toLowerCase().includes(q) || c.phone.includes(q.replace(/\D/g, ''));
                      });
                      if (!visible.length) {
                        return (
                          <p className="text-xs text-gray-500 py-3 text-center">
                            {contacts.length ? 'No hay más contactos para agregar' : 'No hay contactos. Usa el formulario de arriba.'}
                          </p>
                        );
                      }
                      return visible.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-3 text-sm min-h-[48px] px-2 rounded-xl active:bg-white/5 touch-manipulation"
                        >
                          <input
                            type="checkbox"
                            className="w-5 h-5 accent-[#25D366] shrink-0"
                            checked={selectedContacts.has(c.phone)}
                            onChange={() => {
                              setSelectedContacts((prev) => {
                                const n = new Set(prev);
                                if (n.has(c.phone)) n.delete(c.phone); else n.add(c.phone);
                                return n;
                              });
                            }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{c.name}</span>
                            <span className="block text-[11px] text-gray-500">{formatPhone(c.phone)}</span>
                          </span>
                        </label>
                      ));
                    })()}
                  </div>
                  <button
                    type="button"
                    disabled={addingMembers || selectedContacts.size === 0}
                    onClick={() => addToList(list.id)}
                    className="w-full min-h-[48px] rounded-2xl bg-[#25D366] text-black text-sm font-bold disabled:opacity-40 touch-manipulation relative z-20"
                  >
                    <Users className="w-4 h-4 inline mr-1" />
                    {addingMembers ? 'Agregando…' : `Agregar seleccionados (${selectedContacts.size})`}
                  </button>
                </div>
              )}
            </div>
          ))}

          {lists.length === 0 && (
            <p className="text-center text-gray-500 py-10 text-sm">Crea tu primera lista arriba.</p>
          )}
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-3 pb-28">
          {showCampaignForm && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#121214] border border-white/10 p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center justify-between sticky top-0 bg-[#121214] py-1 z-10">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#FF8A00]">
                    <Pencil className="w-4 h-4" />
                    {editingId ? 'Editar campaña' : 'Nueva campaña'}
                  </div>
                  <button type="button" onClick={closeCampaignForm} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400" aria-label="Cerrar">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <select
                  value={campaignForm.listId}
                  onChange={(e) => setCampaignForm({ ...campaignForm, listId: e.target.value })}
                  className="w-full min-h-[48px] bg-black/40 border border-white/10 rounded-2xl px-4 text-base"
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
                  className="w-full min-h-[48px] bg-black/40 border border-white/10 rounded-2xl px-4 text-base"
                />
                <textarea
                  value={campaignForm.messageText}
                  onChange={(e) => setCampaignForm({ ...campaignForm, messageText: e.target.value })}
                  placeholder="Mensaje a enviar..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-base"
                />
                <ImagePicker
                  multiple
                  max={8}
                  values={campaignForm.mediaUrls}
                  onChangeMany={(urls) => setCampaignForm({ ...campaignForm, mediaUrls: urls })}
                  label="Fotos"
                />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="block">Pausa min (s)
                    <input type="number" inputMode="numeric" value={campaignForm.delayMinSec} onChange={(e) => setCampaignForm({ ...campaignForm, delayMinSec: Number(e.target.value) })} className="w-full mt-1 min-h-[44px] bg-black/40 border border-white/10 rounded-xl px-3" />
                  </label>
                  <label className="block">Pausa max (s)
                    <input type="number" inputMode="numeric" value={campaignForm.delayMaxSec} onChange={(e) => setCampaignForm({ ...campaignForm, delayMaxSec: Number(e.target.value) })} className="w-full mt-1 min-h-[44px] bg-black/40 border border-white/10 rounded-xl px-3" />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={saveCampaign}
                  disabled={saving}
                  className="w-full min-h-[52px] rounded-2xl bg-[#25D366] text-black font-bold disabled:opacity-60 touch-manipulation"
                >
                  {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear campaña'}
                </button>
              </div>
            </div>
          )}

          {campaigns.map((c) => (
            <div
              key={c.id}
              className={`glass rounded-2xl p-3.5 ${editingId === c.id ? 'border border-[#FF8A00]/40' : ''}`}
            >
              <button
                type="button"
                onClick={() => openEditCampaign(c)}
                className="w-full text-left touch-manipulation"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm leading-snug">{c.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusColor(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">{c.list?.name}</p>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2 leading-snug">{c.messageText}</p>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-[#25D366] rounded-full transition-all"
                    style={{ width: `${c.stats.total ? Math.round((c.stats.sent / c.stats.total) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-[11px] mt-1.5 text-[#00D1FF]">
                  {c.stats.sent}/{c.stats.total} · {c.stats.pending} pend. · {c.stats.failed} fallidos
                </p>
              </button>

              {(c.jobs || []).filter((j) => j.status === 'failed').slice(0, 2).map((j) => (
                <p key={j.id} className="text-[11px] mt-1 text-red-400 truncate">
                  {j.contactName || j.phone}: {j.error || 'Error'}
                </p>
              ))}

              {/* Bottom action bar — thumb friendly */}
              <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={(e) => duplicateCampaign(c.id, e)}
                  className="min-h-[44px] rounded-xl bg-white/5 text-gray-300 flex flex-col items-center justify-center gap-0.5 touch-manipulation"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-[9px]">Copiar</span>
                </button>
                {c.stats.failed > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => retryFailed(c.id, e)}
                    className="min-h-[44px] rounded-xl bg-white/5 text-[#00D1FF] flex flex-col items-center justify-center gap-0.5 touch-manipulation"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-[9px]">Retry</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openEditCampaign(c)}
                    className="min-h-[44px] rounded-xl bg-white/5 text-gray-300 flex flex-col items-center justify-center gap-0.5 touch-manipulation"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="text-[9px]">Editar</span>
                  </button>
                )}
                {c.status === 'running' ? (
                  <button
                    type="button"
                    onClick={(e) => pauseCampaign(c.id, e)}
                    className="min-h-[44px] col-span-2 rounded-xl bg-[#FF8A00] text-black font-bold flex items-center justify-center gap-1.5 touch-manipulation"
                  >
                    <Pause className="w-4 h-4" /> Pausar
                  </button>
                ) : c.status !== 'completed' ? (
                  <button
                    type="button"
                    onClick={(e) => startCampaign(c.id, e)}
                    className="min-h-[44px] col-span-2 rounded-xl bg-[#25D366] text-black font-bold flex items-center justify-center gap-1.5 touch-manipulation"
                  >
                    <Play className="w-4 h-4" /> Enviar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => duplicateCampaign(c.id, e)}
                    className="min-h-[44px] col-span-2 rounded-xl bg-[#00D1FF] text-black font-bold flex items-center justify-center gap-1.5 touch-manipulation"
                  >
                    <Copy className="w-4 h-4" /> Nueva copia
                  </button>
                )}
              </div>
            </div>
          ))}

          {campaigns.length === 0 && !showCampaignForm && (
            <p className="text-center text-gray-500 py-10 text-sm px-4">
              Crea una campaña para enviar a tu lista con pausa automática.
            </p>
          )}

          {/* Sticky FAB above bottom nav */}
          <div className="fixed left-0 right-0 z-30 px-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] pointer-events-none">
            <div className="max-w-3xl mx-auto pointer-events-auto">
              <button
                type="button"
                onClick={openNewCampaign}
                className="w-full min-h-[52px] rounded-2xl bg-[#FF8A00] text-black font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30 touch-manipulation"
              >
                <MessageCircle className="w-5 h-5" /> Nueva campaña
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
