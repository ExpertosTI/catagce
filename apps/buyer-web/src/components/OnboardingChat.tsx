'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { ImageUpload } from '@/components/ImageUpload';

type ChatMsg = { role: 'user' | 'assistant'; content: string; id: string };
type SetupDraft = Record<string, unknown>;

type ChatResponse = {
  reply: string;
  setup?: SetupDraft;
  readyToApply: boolean;
  phase: string;
  suggestions: string[];
  askUpload?: 'logo' | 'product' | null;
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
  const [askUpload, setAskUpload] = useState<'logo' | 'product' | null>(null);
  const [skipping, setSkipping] = useState(false);
  const setupRef = useRef<SetupDraft>({});

  useEffect(() => { setupRef.current = setup; }, [setup]);

  const pushAssistant = useCallback((content: string) => {
    const id = uid();
    setMessages((prev) => [...prev, { role: 'assistant', content, id }]);
    setTypingId(id);
    return id;
  }, []);

  const applyResponse = (res: ChatResponse) => {
    const nextSetup = mergeSetup(setupRef.current, res.setup);
    setupRef.current = nextSetup;
    setSetup(nextSetup);
    setReadyToApply(res.readyToApply);
    setPhase(res.phase);
    setSuggestions(res.suggestions || []);
    setAskUpload(res.askUpload || null);
    pushAssistant(res.reply);
  };

  useEffect(() => {
    apiFetch<ChatResponse>('/onboarding/chat')
      .then((res) => {
        setPhase(res.phase);
        setSuggestions(res.suggestions || []);
        setAskUpload(res.askUpload || null);
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
  }, [messages, loading, typingId, askUpload]);

  const send = async (text: string, setupOverride?: SetupDraft, opts?: { force?: boolean }) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    // Allow omit/skip even while typewriter is running
    const isOmit = /omitir|saltar|después|despues|skip|no tengo/i.test(trimmed);
    if (typingId && !opts?.force && !isOmit) return;
    if (typingId) setTypingId(null);
    setInput('');
    const currentSetup = setupOverride || setupRef.current;
    if (setupOverride) {
      setupRef.current = setupOverride;
      setSetup(setupOverride);
    }
    const userMsg: ChatMsg = { role: 'user', content: trimmed, id: uid() };
    const history = [...messages, userMsg];
    setMessages(history);
    setSuggestions([]);
    setAskUpload(null);
    setLoading(true);
    try {
      const res = await apiFetch<ChatResponse>('/onboarding/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          setup: currentSetup,
          phase,
        }),
      });
      applyResponse(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión';
      pushAssistant(`Hubo un problema: ${msg}. Intenta de nuevo.`);
    } finally {
      setLoading(false);
    }
  };

  const onImageUploaded = async (url: string) => {
    if (!url || loading) return;
    if (askUpload === 'logo') {
      const next = mergeSetup(setupRef.current, { logoUrl: url });
      await send('Listo, ya subí el logo', next, { force: true });
    } else if (askUpload === 'product') {
      const next = mergeSetup(setupRef.current, { productImageUrl: url });
      await send('Listo, ya subí la foto del producto', next, { force: true });
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
    if (skipping) return;
    setSkipping(true);
    setTypingId(null);
    try {
      await apiFetch('/sellers/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ step: 5, completed: true }),
      });
      router.replace('/dashboard');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'No se pudo omitir. Intenta de nuevo.');
      setSkipping(false);
    }
  };

  const phases = ['Marca', 'Producto', 'Catálogo', 'Listo'];
  const phaseIdx = (() => {
    if (phase === 'brand' || phase === 'logo') return 0;
    if (phase === 'product' || phase === 'product_photo') return 1;
    if (phase === 'catalog') return 2;
    if (phase === 'done') return 3;
    return 0;
  })();
  const inputLocked = loading || boot;
  const chipsLocked = loading || boot;

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

      {askUpload && !done && !loading && (
        <div className="mt-4 glass rounded-2xl p-4 msg-in">
          <ImageUpload
            value={
              askUpload === 'logo'
                ? String(setup.logoUrl || '')
                : String(setup.productImageUrl || '')
            }
            onChange={onImageUploaded}
            label={askUpload === 'logo' ? 'Logo de tu empresa' : 'Foto del producto'}
          />
          <button
            type="button"
            onClick={() => send(askUpload === 'logo' ? 'Omitir logo por ahora' : 'Omitir foto por ahora', undefined, { force: true })}
            className="mt-3 w-full text-sm text-gray-400 hover:text-white py-2"
          >
            Omitir {askUpload === 'logo' ? 'logo' : 'foto'}
          </button>
        </div>
      )}

      {Object.keys(setup).length > 0 && (
        <div className="mt-4 glass rounded-xl p-3 text-xs text-gray-400">
          <span className="text-[#00D1FF] font-semibold text-sm block mb-1">Borrador</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(setup)
              .filter(([k]) => !k.endsWith('Skipped'))
              .map(([k, v]) => (
              <span key={k} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 max-w-full truncate">
                <span className="text-gray-500">{k}: </span>
                {String(v).startsWith('http') ? '✓ subido' : String(v)}
              </span>
            ))}
          </div>
        </div>
      )}

      {suggestions.length > 0 && !done && !chipsLocked && (
        <div className="flex flex-wrap gap-2 mt-4 msg-in">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s, undefined, { force: true })}
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
              placeholder={loading ? 'Esperando al asistente...' : 'Escribe tu respuesta...'}
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
          <button
            type="button"
            onClick={skip}
            disabled={skipping}
            className="text-sm text-gray-500 hover:text-gray-300 ml-auto disabled:opacity-50"
          >
            {skipping ? 'Saliendo…' : 'Omitir por ahora'}
          </button>
        )}
      </div>
    </div>
  );
}
