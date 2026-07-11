'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2, Zap } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
}

export function AiAssistant({ hideFab = false }: { hideFab?: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy Catagce AI, tu super-asistente. Puedo gestionar productos, inventario, catálogos, pedidos, integraciones y más. ¿En qué te ayudo?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && aiReady === null) {
      apiFetch<{ hasApiKey: boolean }>('/ai/config')
        .then((c) => setAiReady(c.hasApiKey))
        .catch(() => setAiReady(false));
    }
  }, [open, aiReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await apiFetch<{ reply: string; sessionId: string; actionsPerformed: string[] }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg, sessionId }),
      });
      setSessionId(res.sessionId);
      setAiReady(true);
      setMessages((m) => [...m, {
        role: 'assistant',
        content: res.reply,
        actions: res.actionsPerformed?.length ? res.actionsPerformed : undefined,
      }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${err.message}` }]);
      if (err.message?.includes('API Key')) setAiReady(false);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    '¿Cuántos pedidos pendientes tengo?',
    'Lista mis productos con poco stock',
    'Crea un catálogo con todos mis productos',
    'Muéstrame las analíticas del negocio',
  ];

  return (
    <>
      {!hideFab && (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-3 z-30 w-12 h-12 rounded-full bg-gradient-to-br from-[#00D1FF] to-[#0099cc] text-black shadow-[0_0_24px_rgba(0,209,255,0.4)] flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Abrir asistente AI"
      >
        <Sparkles className="w-5 h-5" />
      </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-44 left-3 right-3 sm:left-auto sm:right-6 z-50 w-auto sm:w-[380px] max-w-[calc(100vw-1.5rem)] h-[520px] max-h-[70vh] glass rounded-3xl flex flex-col shadow-2xl border border-[#00D1FF]/20 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-[#00D1FF]/10 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#00D1FF] flex items-center justify-center">
                  <Zap className="w-4 h-4 text-black" />
                </div>
                <div>
                  <p className="font-bold text-sm">Catagce AI</p>
                  <p className="text-[10px] text-gray-400">Superpower · Gemini</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            {aiReady === false && (
              <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-xs text-yellow-400">
                Configura tu Google AI API Key en Configuración → Superpower AI
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-[#00D1FF] text-black rounded-br-md'
                      : 'bg-white/5 text-gray-200 rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.actions && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-gray-400 font-mono">
                        {msg.actions.map((a, j) => <div key={j}>✓ {a.split(':')[0]}</div>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Ejecutando acciones...
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-[10px] px-2.5 py-1 bg-white/5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="p-3 border-t border-white/10 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Pídeme cualquier cosa..."
                className="flex-1 h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#00D1FF]"
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="w-10 h-10 bg-[#00D1FF] text-black rounded-xl flex items-center justify-center disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
