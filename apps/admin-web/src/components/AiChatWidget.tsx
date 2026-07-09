'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, Send, Loader2, Bot, Settings } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useCompany } from '../lib/useCompany';

type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  '¿Qué facturas están vencidas?',
  '¿Quién me debe más dinero?',
  'Resumen de pedidos recientes',
  'Envíame por WhatsApp un reporte de cobros pendientes',
  '¿Cuántos despachos están pendientes?',
];

export function AiChatWidget() {
  const company = useCompany();
  const hasGeminiKey = company?.settings?.hasGeminiKey;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const nextMessages: Message[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    try {
      const res = await apiFetch<{ reply: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: content, history: nextMessages.slice(-8) }),
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'No pude procesar su solicitud. Intente de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ai-chat-fab"
        aria-label="Super AI — Asistente inteligente"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {open && (
        <div className="ai-chat-panel animate-fade-in">
          <div className="ai-chat-header">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div>
                <p className="font-bold text-sm">Super AI</p>
                <p className="text-[11px] opacity-80">Super AI · pedidos, cobros y WhatsApp</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded-lg">
              <X size={18} />
            </button>
          </div>

          {company && !hasGeminiKey && (
            <div className="mx-3 mt-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-xs text-amber-50 flex items-start gap-2">
              <Settings size={14} className="shrink-0 mt-0.5" />
              <span>
                Para respuestas inteligentes, configure su API de Google en{' '}
                <Link href="/dashboard/settings" className="font-semibold underline hover:text-white" onClick={() => setOpen(false)}>
                  Ajustes
                </Link>
                .
              </span>
            </div>
          )}

          <div className="ai-chat-body">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">Pregúnteme sobre facturas, cobros o inventario.</p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="ai-suggestion-chip">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-bubble-row ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={m.role === 'user' ? 'ai-bubble-user' : 'ai-bubble-assistant'}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="ai-bubble-row justify-start">
                <div className="ai-bubble-assistant flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Pensando...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="ai-chat-input-row"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escriba su pregunta..."
              className="ai-chat-input"
            />
            <button type="submit" disabled={loading || !input.trim()} className="ai-chat-send">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
