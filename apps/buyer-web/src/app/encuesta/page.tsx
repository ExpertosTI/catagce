'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Box, Trophy, Send } from 'lucide-react';
import { publicFetch } from '@/lib/api';

type Option = { id: string; name: string; sortOrder: number };
type Survey = { isOpen: boolean; endsAt: string; options: Option[] };
type Stats = {
  isOpen: boolean;
  endsAt: string;
  totalVotes: number;
  ranking: Array<{ id: string; name: string; points: number; first: number; second: number; third: number }>;
  suggestions: Array<{ id: string; suggestion: string }>;
};

const STORAGE_KEY = 'catagce_survey_voter';
const VOTED_KEY = 'catagce_survey_voted';

function getOrCreateVoterKey() {
  if (typeof window === 'undefined') return '';
  let key = localStorage.getItem(STORAGE_KEY);
  if (!key) {
    key = `v_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(STORAGE_KEY, key);
  }
  return key;
}

export default function EncuestaPage() {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [s, st] = await Promise.all([
        publicFetch<Survey>('/public/survey'),
        publicFetch<Stats>('/public/survey/stats'),
      ]);
      setSurvey(s);
      setStats(st);
      if (typeof window !== 'undefined' && localStorage.getItem(VOTED_KEY)) setVoted(true);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar la encuesta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const endsLabel = useMemo(() => {
    if (!survey?.endsAt) return '';
    return new Date(survey.endsAt).toLocaleString('es-DO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, [survey?.endsAt]);

  const togglePick = (id: string) => {
    setPicks((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const submitVote = async () => {
    setError('');
    setMsg('');
    if (picks.length !== 3) {
      setError('Elige exactamente 3 nombres en orden (1º, 2º y 3º)');
      return;
    }
    try {
      await publicFetch('/public/survey/vote', {
        method: 'POST',
        body: JSON.stringify({
          voterKey: getOrCreateVoterKey(),
          rank1: picks[0],
          rank2: picks[1],
          rank3: picks[2],
        }),
      });
      localStorage.setItem(VOTED_KEY, '1');
      setVoted(true);
      setMsg('¡Gracias! Tu voto quedó registrado.');
      const st = await publicFetch<Stats>('/public/survey/stats');
      setStats(st);
    } catch (e: any) {
      setError(e?.message || 'No se pudo votar');
    }
  };

  const submitSuggest = async () => {
    setError('');
    try {
      await publicFetch('/public/survey/suggest', {
        method: 'POST',
        body: JSON.stringify({
          voterKey: getOrCreateVoterKey(),
          suggestion,
        }),
      });
      setSuggestion('');
      setMsg('Sugerencia enviada. ¡Gracias!');
      const st = await publicFetch<Stats>('/public/survey/stats');
      setStats(st);
    } catch (e: any) {
      setError(e?.message || 'No se pudo enviar la sugerencia');
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-[#00D1FF]/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-1/3 w-[560px] h-[560px] bg-[#00D1FF]/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[10%] right-0 w-[380px] h-[380px] bg-[#FF8A00]/08 rounded-full blur-[100px]" />
      </div>

      <header className="relative z-20 flex items-center justify-between px-5 md:px-10 py-5 max-w-3xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00D1FF] rounded-lg flex items-center justify-center">
            <Box className="text-black w-4 h-4" />
          </div>
          <span className="text-lg font-black tracking-tight">
            Catagce<span className="text-[#00D1FF]">.</span>
          </span>
        </Link>
        <span className="text-xs text-gray-500">Encuesta 3 días</span>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-5 pb-20">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
          ¿Cómo debería llamarse?
        </h1>
        <p className="text-gray-400 mb-2">
          Elige <strong className="text-white">3 nombres</strong> en orden: el 1º es tu favorito.
        </p>
        {endsLabel && (
          <p className="text-sm text-gray-500 mb-8">
            Cierra: {endsLabel}
            {survey && (
              <span className={`ml-2 ${survey.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                · {survey.isOpen ? 'Abierta' : 'Cerrada'}
              </span>
            )}
          </p>
        )}

        {loading && <p className="text-gray-500">Cargando...</p>}
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        {msg && <p className="mb-4 text-sm text-green-400">{msg}</p>}

        {survey?.isOpen && !voted && (
          <section className="space-y-3 mb-10">
            {survey.options.map((opt) => {
              const rank = picks.indexOf(opt.id);
              const selected = rank >= 0;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => togglePick(opt.id)}
                  className={`w-full text-left flex items-center gap-4 px-4 py-4 rounded-2xl border transition-colors ${
                    selected
                      ? 'border-[#00D1FF] bg-[#00D1FF]/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm ${
                      selected ? 'bg-[#00D1FF] text-black' : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {selected ? rank + 1 : '·'}
                  </span>
                  <span className="text-xl font-bold tracking-tight">{opt.name}</span>
                </button>
              );
            })}

            <p className="text-xs text-gray-500 pt-2">
              Orden actual:{' '}
              {picks.length
                ? picks
                    .map((id, i) => `${i + 1}º ${survey.options.find((o) => o.id === id)?.name}`)
                    .join(' · ')
                : 'ninguno'}
            </p>

            <button
              type="button"
              onClick={submitVote}
              disabled={picks.length !== 3}
              className="w-full mt-2 py-3.5 rounded-2xl bg-[#00D1FF] text-black font-black disabled:opacity-40"
            >
              Enviar mis 3 favoritos
            </button>
          </section>
        )}

        {(voted || !survey?.isOpen) && (
          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
              <Trophy className="w-5 h-5 text-[#FF8A00]" /> Resultados
            </h2>
            <p className="text-sm text-gray-500 mb-4">{stats?.totalVotes || 0} votos · puntos: 1º=3, 2º=2, 3º=1</p>
            <div className="space-y-2">
              {(stats?.ranking || []).map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <span className="text-[#FF8A00] font-black w-6">{i + 1}</span>
                  <span className="flex-1 font-semibold text-lg">{r.name}</span>
                  <span className="text-sm text-gray-400">{r.points} pts</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {survey?.isOpen && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-bold mb-2">¿Sugieres otro nombre?</h2>
            <p className="text-sm text-gray-500 mb-3">Opcional. Puede ser una idea nueva.</p>
            <div className="flex gap-2">
              <input
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                maxLength={80}
                placeholder="Ej. Renacate"
                className="flex-1 h-12 px-4 rounded-xl bg-black/40 border border-white/10 focus:outline-none focus:border-[#00D1FF]"
              />
              <button
                type="button"
                onClick={submitSuggest}
                disabled={suggestion.trim().length < 2}
                className="px-4 rounded-xl bg-[#FF8A00] text-black font-bold disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {!!stats?.suggestions?.length && (
              <div className="mt-4 flex flex-wrap gap-2">
                {stats.suggestions.slice(0, 12).map((s) => (
                  <span key={s.id} className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">
                    {s.suggestion}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
