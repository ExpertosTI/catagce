'use client';

import { useEffect, useState } from 'react';
import { X, MessageCircle, UserPlus, Send, Radio, ExternalLink, Copy, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { normalizePhone, buildWhatsAppShareUrl, buildCatalogShareMessage } from '@/lib/whatsapp';
import { ImagePicker } from '@/components/ImagePicker';

type Contact = { id: string; name: string; phone: string; source: string };
type BroadcastList = {
  id: string;
  name: string;
  members?: Array<{ id: string; name: string; phone: string }>;
};
type SharePayload = { link: string; message: string; catalogName: string };

export function ShareCatalogModal({
  catalogId,
  catalogName,
  onClose,
}: {
  catalogId: string;
  catalogName: string;
  onClose: () => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<BroadcastList[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<Contact[]>('/contacts').catch(() => []),
      apiFetch<BroadcastList[]>('/broadcast/lists').catch(() => []),
      apiFetch<SharePayload>(`/catalogs/id/${catalogId}/share-payload`).catch(() => null),
    ]).then(([c, l, p]) => {
      setContacts(c || []);
      setLists(l || []);
      if (p) {
        setPayload(p);
        setMessage(p.message);
      } else {
        setMessage(buildCatalogShareMessage({
          catalogName,
          link: `${typeof window !== 'undefined' ? window.location.origin : ''}/catalog`,
        }));
      }
    });
  }, [catalogId, catalogName]);

  const toggle = (phone: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const toggleList = (list: BroadcastList) => {
    const phones = (list.members || []).map((m) => m.phone).filter(Boolean);
    setSelectedLists((prev) => {
      const next = new Set(prev);
      const turningOn = !next.has(list.id);
      if (turningOn) next.add(list.id);
      else next.delete(list.id);

      setSelected((phonesPrev) => {
        const p = new Set(phonesPrev);
        for (const phone of phones) {
          if (turningOn) p.add(phone);
          else p.delete(phone);
        }
        return p;
      });

      return next;
    });
  };

  const addManual = () => {
    const phone = normalizePhone(manualPhone);
    if (phone.length < 11) return;
    setSelected((prev) => new Set(prev).add(phone));
    if (manualName.trim()) {
      setContacts((prev) => [...prev, { id: `manual-${phone}`, name: manualName, phone, source: 'manual' }]);
    }
    setManualPhone('');
    setManualName('');
  };

  const recipientPhones = () => {
    const phones = new Set(selected);
    const manual = normalizePhone(manualPhone);
    if (manual.length >= 11) phones.add(manual);
    return Array.from(phones);
  };

  const shareText = message.trim() || payload?.message || '';

  const openWa = (phone?: string) => {
    const url = buildWhatsAppShareUrl(shareText, phone);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyGeneric = async () => {
    const url = buildWhatsAppShareUrl(shareText);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const send = async () => {
    const phones = recipientPhones();
    if (!phones.length) {
      setError('Selecciona contactos o abre WhatsApp manualmente');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch<{ sent: number; failed: number; link: string }>(
        `/catalogs/${catalogId}/share-whatsapp`,
        { method: 'POST', body: JSON.stringify({ phones, message: message || undefined, imageUrl }) },
      );
      setSuccess(`Enviado a ${res.sent} contacto(s) por WhatsApp conectado`);
      if (res.failed) setError(`${res.failed} número(s) fallaron`);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo enviar por Evolution — usa “Abrir WhatsApp”'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg glass rounded-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            Compartir por WhatsApp
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-400">
            Catálogo: <strong className="text-white">{catalogName}</strong>
          </p>
          {payload?.link && (
            <p className="text-xs text-gray-500 break-all">Link: {payload.link}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openWa()}
              className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-[#25D366] text-black font-bold text-sm flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir WhatsApp
            </button>
            <button
              type="button"
              onClick={copyGeneric}
              className="px-4 py-2.5 rounded-xl bg-white/10 text-sm flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              Copiar wa.me
            </button>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#FF8A00]" /> Listas de difusión
            </p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {lists.length === 0 ? (
                <p className="text-sm text-gray-600 py-2">
                  Sin listas.{' '}
                  <a href="/dashboard/difusion" className="text-[#00D1FF] underline">Crear en Difusión</a>
                </p>
              ) : lists.map((list) => (
                <label key={list.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer touch-manipulation">
                  <input
                    type="checkbox"
                    checked={selectedLists.has(list.id)}
                    onChange={() => toggleList(list)}
                    className="accent-[#FF8A00]"
                  />
                  <span className="flex-1 text-sm font-medium">{list.name}</span>
                  <span className="text-xs text-gray-500">{list.members?.length || 0} contactos</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Contactos — abrir chat</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {contacts.length === 0 ? (
                <p className="text-sm text-gray-600 py-2">
                  Sin contactos. <a href="/dashboard/contacts" className="text-[#00D1FF] underline">Crear contactos</a>
                </p>
              ) : contacts.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={selected.has(c.phone)}
                    onChange={() => toggle(c.phone)}
                    className="accent-[#25D366]"
                  />
                  <span className="flex-1 text-sm">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => openWa(c.phone)}
                    className="text-xs px-2 py-1 rounded-lg bg-[#25D366]/20 text-[#25D366]"
                  >
                    Abrir
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Nombre (opcional)"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
            />
            <input
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              placeholder="8095551234"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
            />
            <button type="button" onClick={addManual} className="px-3 py-2 rounded-xl bg-white/10">
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
          {manualPhone && normalizePhone(manualPhone).length >= 11 && (
            <button
              type="button"
              onClick={() => openWa(manualPhone)}
              className="w-full py-2 rounded-xl border border-[#25D366]/40 text-[#25D366] text-sm font-medium"
            >
              Abrir WhatsApp con este número
            </button>
          )}

          <ImagePicker value={imageUrl} onChange={setImageUrl} label="Imagen del catálogo (opcional)" />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensaje personalizado..."
            rows={4}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm resize-none"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}

          <button
            type="button"
            onClick={send}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white/10 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Enviando...' : `Enviar vía WA conectado (${recipientPhones().length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
