'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type ChatMsg = { role: 'user' | 'assistant'; content: string; id: string };
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

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Typewriter for assistant bubbles */
function TypewriterText({
  text,
  active,
  onDone,
}: {
  text: string;
  active: boolean;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState(active ? '' : text);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setShown(text);
      return;
    }
    setShown('');
    doneRef.current = false;
    let i = 0;
    const step = () => {
      i += 1;
      setShown(text.slice(0, i));
      if (i < text.length) {
        const ch = text[i - 1];
        const delay = ch === '\n' ? 40 : ch === '.' || ch === '?' || ch === '!' ? 28 : 14;
        timer = window.setTimeout(step, delay);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
    };
    let timer = window.setTimeout(step, 80);
    return () => clearTimeout(timer);
  }, [text, active, onDone]);

  return (
    <span
      dangerouslySetInnerHTML={{ __html: renderMarkdownLite(shown) }}
      className={active && shown.length < text.length ? 'typing-caret' : undefined}
    />
  );
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
  const [typingId, setTypingId] = useState<string | null>(null);
  const [boot, setBoot] = useState(true);

  const pushAssistant = useCallback((content: string) => {
    const id = uid();
    setMessages((prev) => [...prev, { role: 'assistant', content, id }]);
    setTypingId(id);
    return id;
  }, []);

  useEffect(() => {
    apiFetch<ChatResponse>('/onboarding/chat')
      .then((res) => {
        setPhase(res.phase);
        setSuggestions(res.suggestions || []);
        const id = uid();
        setMessages([{ role: 'assistant', content: res.reply, id }]);
        setTypingId(id);
      })
      .catch(() => {
        const id = uid();
        setMessages([{
          role: 'assistant',
          content: '¡Hola! Cuéntame sobre tu negocio: nombre, colores de marca y tu primer producto con precio.',
          id,
        }]);
        setTypingId(id);
      })
      .finally(() => setBoot(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, typingId]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || typingId) return;
    setInput('');
    const userMsg: ChatMsg = { role: 'user', content: trimmed, id: uid() };
    const history = [...messages, userMsg];
    setMessages(history);
    setSuggestions([]);
    setLoading(true);
    try {
      const res = await apiFetch<ChatResponse>('/onboarding/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          setup,
          phase,
        }),
      });
      const nextSetup = mergeSetup(setup, res.setup);
      setSetup(nextSetup);
      setReadyToApply(res.readyToApply);
      setPhase(res.phase);
      setSuggestions(res.suggestions || []);
      pushAssistant(res.reply);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión';
      pushAssistant(`Hubo un problema: ${msg}. Intenta de nuevo.`);
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
      setPhase('done');
      pushAssistant('¡Listo! Tu marca, producto y catálogo quedaron configurados. Ya puedes ir al panel.');
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
  const inputLocked = loading || Boolean(typingId) || boot;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
      <style>{`
        .typing-caret::after {
          content: '▋';
          margin-left: 2px;
          animation: caret-blink 0.7s step-end infinite;
          color: #00D1FF;
          font-weight: 400;
        }
        @keyframes caret-blink {
          50% { opacity: 0; }
        }
        @keyframes bubble-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .msg-in {
          animation: bubble-in 0.35s ease-out both;
        }
      `}</style>

      <div className="flex items-center gap-2 mb-4 px-1">
        {phases.map((p, i) => (
          <div key={p} className="flex items-center flex-1">
            <div className={`text-xs font-semibold px-2 py-1 rounded-full transition-colors duration-300 ${
              i <= phaseIdx ? 'bg-[#00D1FF] text-black' : 'bg-white/10 text-gray-500'
            }`}>
              {p}
            </div>
            {i < phases.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 transition-colors duration-500 ${i < phaseIdx ? 'bg-[#00D1FF]' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 min-h-[320px] max-h-[50vh] pr-1">
        {messages.map((m) => (
          <div key={m.id} className={`flex msg-in ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-[#00D1FF] text-black'
                : 'bg-white/10 text-gray-100'
            }`}>
              {m.role === 'assistant' ? (
                <TypewriterText
                  text={m.content}
                  active={typingId === m.id}
                  onDone={() => setTypingId((cur) => (cur === m.id ? null : cur))}
                />
              ) : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start msg-in">
            <div className="bg-white/10 rounded-2xl px-4 py-3 text-sm text-gray-400 flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D1FF] animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D1FF] animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D1FF] animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {Object.keys(setup).length > 0 && (
        <div className="mt-4 glass rounded-xl p-3 text-xs text-gray-400">
          <span className="text-[#00D1FF] font-semibold text-sm block mb-1">Borrador</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(setup).map(([k, v]) => (
              <span key={k} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                <span className="text-gray-500">{k}: </span>{String(v)}
              </span>
            ))}
          </div>
        </div>
      )}

      {suggestions.length > 0 && !done && !typingId && !loading && (
        <div className="flex flex-wrap gap-2 mt-4 msg-in">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-white/20 text-gray-300 hover:bg-white/10 hover:border-[#00D1FF]/40 transition"
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
              placeholder={typingId ? 'Esperando al asistente...' : 'Escribe tu respuesta...'}
              disabled={inputLocked}
              className="flex-1 h-12 px-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/40 text-sm disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={inputLocked || !input.trim()}
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
        {!done && readyToApply && !typingId && (
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
