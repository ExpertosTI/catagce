'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle, RefreshCw, Send, Tag, Clock, User, Filter, Zap, Plus,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { useRequireAuth } from '@/hooks/useRequireAuth';

type LinkedOrder = {
  id: string;
  ref: string;
  status: string;
  totalAmount?: string;
  source?: string;
  items?: Array<{ name?: string; quantity?: string; unitPrice?: string }>;
};

type Ticket = {
  id: string;
  phone: string;
  contactName?: string;
  status: string;
  labelIds?: string[];
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  linkedOrder?: LinkedOrder | null;
};

type Label = { id: string; name: string; color: string };
type Message = { id?: string; fromMe: boolean; text: string; timestamp?: string };
type QuickReply = { id: string; title: string; body: string; shortcut?: string };

const STATUS_FILTERS = [
  { key: '', label: 'Todos' },
  { key: 'open', label: 'Abiertos' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'resolved', label: 'Resueltos' },
  { key: 'closed', label: 'Cerrados' },
];

const STATUS_OPTIONS = [
  { key: 'open', label: 'Abierto', color: '#00D1FF' },
  { key: 'pending', label: 'Pendiente', color: '#FF8A00' },
  { key: 'resolved', label: 'Resuelto', color: '#22c55e' },
  { key: 'closed', label: 'Cerrado', color: '#6b7280' },
];

export default function WhatsAppInboxPage() {
  const { ensureAuth, onApiError } = useRequireAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [waReady, setWaReady] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [linkedOrder, setLinkedOrder] = useState<LinkedOrder | null>(null);
  const [newQuickTitle, setNewQuickTitle] = useState('');
  const [newQuickBody, setNewQuickBody] = useState('');

  const loadMeta = useCallback(async () => {
    const [statusRes, labelsRes, qrRes] = await Promise.all([
      apiFetch<{ whatsapp: boolean; ready: boolean }>('/whatsapp-inbox/status'),
      apiFetch<{ local: Label[] }>('/whatsapp-inbox/labels'),
      apiFetch<QuickReply[]>('/whatsapp-inbox/quick-replies'),
    ]);
    setWaReady(statusRes.ready);
    setLabels(labelsRes.local || []);
    setQuickReplies(qrRes || []);
  }, []);

  const loadTickets = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (labelFilter) params.set('labelId', labelFilter);
    const qs = params.toString();
    const data = await apiFetch<Ticket[]>(`/whatsapp-inbox/tickets${qs ? `?${qs}` : ''}`);
    setTickets(data);
  }, [statusFilter, labelFilter]);

  const refresh = useCallback(async () => {
    if (!ensureAuth()) return;
    setError('');
    try {
      await loadMeta();
      await loadTickets();
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [ensureAuth, loadMeta, loadTickets, onApiError]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    try {
      await apiFetch('/whatsapp-inbox/sync', { method: 'POST' });
      await loadTickets();
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err, 'No se pudo sincronizar WhatsApp'));
    } finally {
      setSyncing(false);
    }
  };

  const openTicket = async (ticket: Ticket) => {
    setSelected(ticket);
    setMessages([]);
    setLinkedOrder(ticket.linkedOrder || null);
    try {
      const data = await apiFetch<{ messages: Message[]; order?: LinkedOrder | null }>(`/whatsapp-inbox/tickets/${ticket.id}/messages`);
      setMessages(data.messages || []);
      setLinkedOrder(data.order || ticket.linkedOrder || null);
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, unreadCount: 0 } : t)));
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err));
    }
  };

  const confirmLinkedOrder = async (status: string) => {
    if (!selected) return;
    await apiFetch(`/whatsapp-inbox/tickets/${selected.id}/order/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setLinkedOrder((prev) => (prev ? { ...prev, status } : prev));
  };

  const sendReorderLink = async () => {
    if (!selected) return;
    const res = await apiFetch<{ ok: boolean; link?: string; error?: string }>(
      `/whatsapp-inbox/tickets/${selected.id}/reorder-link`,
      { method: 'POST' },
    );
    if (!res.ok) setError(res.error || 'No se pudo enviar el enlace');
    else await openTicket(selected);
  };

  const parseOrderAi = async () => {
    if (!selected) return;
    setError('');
    const res = await apiFetch<{ ok: boolean; message?: string; draft?: LinkedOrder }>(
      `/whatsapp-inbox/tickets/${selected.id}/parse-order`,
      { method: 'POST' },
    );
    if (!res.ok) setError(res.message || 'No se detectó pedido');
    else {
      setLinkedOrder(res.draft || null);
      await loadTickets();
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/whatsapp-inbox/tickets/${selected.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ text: reply.trim() }),
      });
      setReply('');
      await openTicket(selected);
      await loadTickets();
    } catch (err) {
      if (!onApiError(err)) setError(getErrorMessage(err, 'No se pudo enviar'));
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    const updated = await apiFetch<Ticket>(`/whatsapp-inbox/tickets/${selected.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setSelected(updated);
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const toggleLabel = async (labelId: string) => {
    if (!selected) return;
    const updated = await apiFetch<Ticket>(`/whatsapp-inbox/tickets/${selected.id}/labels/${labelId}`, {
      method: 'PATCH',
    });
    setSelected(updated);
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const addQuickReply = async () => {
    if (!newQuickTitle.trim() || !newQuickBody.trim()) return;
    const created = await apiFetch<QuickReply>('/whatsapp-inbox/quick-replies', {
      method: 'POST',
      body: JSON.stringify({ title: newQuickTitle, body: newQuickBody }),
    });
    setQuickReplies((prev) => [...prev, created]);
    setNewQuickTitle('');
    setNewQuickBody('');
  };

  const labelById = (id: string) => labels.find((l) => l.id === id);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-gray-400">Cargando inbox WhatsApp...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-[#25D366]" />
            WhatsApp Inbox
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Conversaciones con tus clientes. Para enviar a muchos contactos usa{' '}
            <a href="/dashboard/difusion" className="text-[#25D366] font-semibold underline">Difusión</a>.
            {!waReady && ' · WhatsApp no configurado'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowQuickReplies((v) => !v)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10"
          >
            <Zap className="w-4 h-4 inline mr-1" /> Respuestas rápidas
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !waReady}
            className="px-4 py-2 rounded-xl bg-[#25D366] text-black font-semibold text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 inline mr-1 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {showQuickReplies && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-[#FF8A00]" /> Respuestas rápidas</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {quickReplies.map((qr) => (
              <button
                key={qr.id}
                type="button"
                onClick={() => setReply(qr.body)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs hover:border-[#00D1FF]"
              >
                {qr.title}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={newQuickTitle} onChange={(e) => setNewQuickTitle(e.target.value)} placeholder="Título" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            <input value={newQuickBody} onChange={(e) => setNewQuickBody(e.target.value)} placeholder="Mensaje" className="flex-[2] bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            <button type="button" onClick={addQuickReply} className="px-4 py-2 rounded-lg bg-[#00D1FF] text-black text-sm font-semibold"><Plus className="w-4 h-4 inline" /></button>
          </div>
        </motion.div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <Filter className="w-4 h-4 text-gray-500 mt-2" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              statusFilter === f.key ? 'bg-[#00D1FF]/20 border-[#00D1FF] text-[#00D1FF]' : 'border-white/10 text-gray-400'
            }`}
          >
            {f.label}
          </button>
        ))}
        {labels.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLabelFilter(labelFilter === l.id ? '' : l.id)}
            className="px-3 py-1 rounded-full text-xs font-medium border"
            style={{
              borderColor: labelFilter === l.id ? l.color : 'rgba(255,255,255,0.1)',
              color: labelFilter === l.id ? l.color : '#9ca3af',
              backgroundColor: labelFilter === l.id ? `${l.color}22` : 'transparent',
            }}
          >
            <Tag className="w-3 h-3 inline mr-1" />{l.name}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4 min-h-[60vh]">
        <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-gray-500">
              Sin conversaciones. Pulsa Sincronizar para importar chats de WhatsApp.
            </div>
          ) : tickets.map((ticket) => {
            const st = STATUS_OPTIONS.find((s) => s.key === ticket.status) || STATUS_OPTIONS[0];
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => openTicket(ticket)}
                className={`w-full text-left glass rounded-2xl p-4 transition-all ${
                  selected?.id === ticket.id ? 'ring-2 ring-[#25D366]' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-semibold">{ticket.contactName || ticket.phone}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" /> {ticket.phone}
                    </p>
                  </div>
                  {(ticket.unreadCount ?? 0) > 0 && (
                    <span className="bg-[#25D366] text-black text-xs font-bold px-2 py-0.5 rounded-full">{ticket.unreadCount}</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-2 line-clamp-2">{ticket.lastMessagePreview || '—'}</p>
                {ticket.linkedOrder && (
                  <p className="text-[10px] mt-1 text-[#25D366] font-semibold">
                    Pedido #{ticket.linkedOrder.ref} · ${ticket.linkedOrder.totalAmount || '—'}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${st.color}22`, color: st.color }}>{st.label}</span>
                  {(ticket.labelIds || []).map((lid) => {
                    const lab = labelById(lid);
                    if (!lab) return null;
                    return (
                      <span key={lid} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${lab.color}22`, color: lab.color }}>
                        {lab.name}
                      </span>
                    );
                  })}
                </div>
                {ticket.lastMessageAt && (
                  <p className="text-[10px] text-gray-600 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(ticket.lastMessageAt).toLocaleString()}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 glass rounded-2xl flex flex-col min-h-[50vh]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 p-8 text-center">
              Selecciona una conversación para ver mensajes y responder
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{selected.contactName || selected.phone}</p>
                  <p className="text-xs text-gray-500">{selected.phone}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => changeStatus(s.key)}
                      className={`text-xs px-2 py-1 rounded-lg border ${
                        selected.status === s.key ? 'font-bold' : 'opacity-60'
                      }`}
                      style={{ borderColor: s.color, color: s.color }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 py-2 border-b border-white/5 flex flex-wrap gap-1">
                {labels.map((l) => {
                  const active = (selected.labelIds || []).includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLabel(l.id)}
                      className={`text-xs px-2 py-1 rounded-full border ${active ? 'font-semibold' : 'opacity-50'}`}
                      style={{ borderColor: l.color, color: l.color, backgroundColor: active ? `${l.color}22` : 'transparent' }}
                    >
                      <Tag className="w-3 h-3 inline mr-1" />{l.name}
                    </button>
                  );
                })}
              </div>

              <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03] space-y-2">
                {linkedOrder ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Pedido vinculado</p>
                      <p className="text-sm font-semibold text-[#25D366]">
                        #{linkedOrder.ref} · ${linkedOrder.totalAmount || '—'} · {linkedOrder.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => confirmLinkedOrder('confirmed')} className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400">Confirmar</button>
                      <button type="button" onClick={() => confirmLinkedOrder('rejected')} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400">Rechazar</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Sin pedido vinculado a este chat</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={sendReorderLink} className="text-xs px-3 py-1.5 rounded-lg bg-[#00D1FF]/15 text-[#00D1FF]">Reenviar catálogo</button>
                  <button type="button" onClick={parseOrderAi} className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-300">IA: crear borrador</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={m.id || i} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                      m.fromMe ? 'bg-[#005C4B] text-white rounded-br-sm' : 'bg-white/10 rounded-bl-sm'
                    }`}>
                      {m.text}
                      {m.timestamp && (
                        <p className="text-[10px] opacity-60 mt-1">{new Date(m.timestamp).toLocaleTimeString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-white/10 flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendReply())}
                  placeholder="Escribe tu respuesta..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm"
                />
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="px-5 py-3 rounded-xl bg-[#25D366] text-black font-semibold disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
