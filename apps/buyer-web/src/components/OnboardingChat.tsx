'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type ChatMsg = { role: 'user' | 'assistant'; content: string };
type SetupDraft = Record<string, unknown>;

type ChatResponse = {
  reply: string;
  setup?: SetupDraft;
  readyToApply: boolean;
  phase: string;
  suggestions: string[];
};

function mergeSetup(prev: SetupDraft, next?: SetupDraft): SetupDraft {
  if (!next) return prev;
  return { ...prev, ...next };
}

function renderMarkdownLite(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');
}

export function OnboardingChat() {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [setup, setSetup] = useState<SetupDraft>({});
  const [phase, setPhase] = useState('brand');
  const [readyToApply, setReadyToApply] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiFetch<ChatResponse>('/onboarding/chat')
      .then((res) => {
        setMessages([{ role: 'assistant', content: res.reply }]);
        setPhase(res.phase);
        setSuggestions(res.suggestions || []);
      })
      .catch(() => {
        setMessages([{
          role: 'assistant',
          content: '¡Hola! Cuéntame sobre tu negocio: nombre, colores de marca y tu primer producto con precio.',
        }]);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');
    const history = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(history);
    setLoading(true);
    try {
      const res = await apiFetch<ChatResponse>('/onboarding/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      setMessages([...history, { role: 'assistant', content: res.reply }]);
      setSetup((prev) => mergeSetup(prev, res.setup));
      setReadyToApply(res.readyToApply);
      setPhase(res.phase);
      setSuggestions(res.suggestions || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión';
      setMessages([...history, { role: 'assistant', content: `Hubo un problema: ${msg}. Intenta de nuevo.` }]);
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    try {
      await apiFetch('/onboarding/apply', {
        method: 'POST',
        body: JSON.stringify({ setup }),
      });
      setDone(true);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: '¡Listo! Tu marca, producto y catálogo quedaron configurados. Ya puedes ir al panel.',
      }]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'No se pudo aplicar la configuración');
    } finally {
      setApplying(false);
    }
  };

  const skip = async () => {
    await apiFetch('/sellers/onboarding', {
      method: 'PATCH',
      body: JSON.stringify({ step: 5, completed: true }),
    }).catch(() => {});
    router.push('/dashboard');
  };

  const phases = ['Marca', 'Producto', 'Catálogo', 'Listo'];
  const phaseIdx = ['brand', 'product', 'catalog', 'done'].indexOf(phase);

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-4 px-1">
        {phases.map((p, i) => (
          <div key={p} className="flex items-center flex-1">
            <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
              i <= phaseIdx ? 'bg-[#00D1FF] text-black' : 'bg-white/10 text-gray-500'
            }`}>
              {p}
            </div>
            {i < phases.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${i < phaseIdx ? 'bg-[#00D1FF]' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 min-h-[320px] max-h-[50vh] pr-1">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-[#00D1FF] text-black'
                : 'bg-white/10 text-gray-100'
            }`}>
              {m.role === 'assistant' ? (
                <span dangerouslySetInnerHTML={{ __html: renderMarkdownLite(m.content) }} />
              ) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-2xl px-4 py-3 text-sm text-gray-400 animate-pulse">
              Escribiendo...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {Object.keys(setup).length > 0 && (
        <div className="mt-4 glass rounded-xl p-3 text-xs text-gray-400 font-mono overflow-x-auto">
          <span className="text-[#00D1FF] font-sans font-semibold text-sm block mb-1">Borrador</span>
          {JSON.stringify(setup, null, 2)}
        </div>
      )}

      {suggestions.length > 0 && !done && (
        <div className="flex flex-wrap gap-2 mt-4">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-white/20 text-gray-300 hover:bg-white/10 transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {!done ? (
          <>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send(input))}
              placeholder="Escribe tu respuesta..."
              className="flex-1 h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/40 text-sm"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="h-12 w-12 rounded-xl bg-[#00D1FF] text-black flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex-1 h-12 rounded-xl bg-[#00D1FF] text-black font-bold flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" /> Ir al Dashboard
          </button>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        {!done && readyToApply && (
          <button
            type="button"
            onClick={apply}
            disabled={applying}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-semibold hover:bg-green-500/30 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {applying ? 'Aplicando...' : 'Aplicar configuración'}
          </button>
        )}
        {!done && (
          <button type="button" onClick={skip} className="text-sm text-gray-500 hover:text-gray-300 ml-auto">
            Omitir por ahora
          </button>
        )}
      </div>
    </div>
  );
}
