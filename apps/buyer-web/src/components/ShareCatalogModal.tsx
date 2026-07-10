'use client';

import { useEffect, useState } from 'react';
import { X, MessageCircle, UserPlus, Send } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getErrorMessage } from '@/lib/auth-errors';
import { normalizePhone } from '@/lib/whatsapp';

type Contact = { id: string; name: string; phone: string; source: string };

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiFetch<Contact[]>('/contacts').then(setContacts).catch(() => {});
  }, []);

  const toggle = (phone: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
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

  const send = async () => {
    const phones = recipientPhones();
    if (!phones.length) {
      setError('Selecciona al menos un contacto o escribe un número');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch<{ sent: number; failed: number; link: string }>(
        `/catalogs/${catalogId}/share-whatsapp`,
        { method: 'POST', body: JSON.stringify({ phones, message: message || undefined }) },
      );
      setSuccess(`Enviado a ${res.sent} contacto(s) por WhatsApp`);
      if (res.failed) setError(`${res.failed} número(s) fallaron`);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo enviar'));
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

          <div>
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Contactos de la app</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {contacts.length === 0 ? (
                <p className="text-sm text-gray-600 py-2">
                  Sin contactos. <a href="/dashboard/contacts" className="text-[#00D1FF] underline">Crear contactos</a>
                </p>
              ) : contacts.map((c) => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(c.phone)}
                    onChange={() => toggle(c.phone)}
                    className="accent-[#25D366]"
                  />
                  <span className="flex-1 text-sm">{c.name}</span>
                  <span className="text-xs text-gray-500">{c.phone}</span>
                </label>
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

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensaje personalizado (opcional)..."
            rows={3}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm resize-none"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}

          <button
            type="button"
            onClick={send}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#25D366] text-black font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Enviando...' : `Enviar a ${recipientPhones().length} contacto(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
