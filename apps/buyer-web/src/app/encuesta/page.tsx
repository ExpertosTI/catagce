'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Box, Heart, Sparkles } from 'lucide-react';
import { publicFetch } from '@/lib/api';

type Option = { id: string; name: string; sortOrder: number; source?: 'official' | 'community' };
type Survey = { isOpen: boolean; endsAt: string; options: Option[] };
type Stats = {
  isOpen: boolean;
  endsAt: string;
  totalVotes: number;
  ranking: Array<{ id: string; name: string; points: number; source?: string }>;
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
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [thanks, setThanks] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const [s, st] = await Promise.all([
        publicFetch<Survey>('/public/survey'),
        publicFetch<Stats>('/public/survey/stats'),
      ]);
      setSurvey(s);
      setStats(st);
      if (typeof window !== 'undefined' && localStorage.getItem(VOTED_KEY)) {
        setVoted(true);
        setThanks(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar la encuesta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const official = useMemo(
    () => (survey?.options || []).filter((o) => o.source !== 'community'),
    [survey],
  );
  const community = useMemo(
    () => (survey?.options || []).filter((o) => o.source === 'community'),
    [survey],
  );

  const togglePick = (id: string) => {
    setPicks((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const submitVote = async () => {
    setError('');
    if (picks.length !== 3) {
      setError('Elige 3 nombres: toca en orden (1º, 2º, 3º).');
      return;
    }
    setSaving(true);
    try {
      // Si escribió una idea nueva, primero la convierte en opción votable
      let picksFinal = [...picks];
      if (suggestion.trim().length >= 2) {
        const res = await publicFetch<{ option?: Option | null }>('/public/survey/suggest', {
          method: 'POST',
          body: JSON.stringify({
            voterKey: getOrCreateVoterKey(),
            suggestion: suggestion.trim(),
          }),
        }).catch(() => null);
        if (res?.option?.id && !picksFinal.includes(res.option.id) && picksFinal.length < 3) {
          picksFinal = [...picksFinal, res.option.id].slice(0, 3);
        }
        // refrescar lista por si quiere verla después
        const s = await publicFetch<Survey>('/public/survey').catch(() => null);
        if (s) setSurvey(s);
      }

      if (picksFinal.length !== 3) {
        setError('Elige exactamente 3 nombres.');
        setSaving(false);
        return;
      }

      await publicFetch('/public/survey/vote', {
        method: 'POST',
        body: JSON.stringify({
          voterKey: getOrCreateVoterKey(),
          rank1: picksFinal[0],
          rank2: picksFinal[1],
          rank3: picksFinal[2],
        }),
      });
      localStorage.setItem(VOTED_KEY, '1');
      setVoted(true);
      setThanks(true);
      const st = await publicFetch<Stats>('/public/survey/stats');
      setStats(st);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar tu voto');
    } finally {
      setSaving(false);
    }
  };

  const nameOf = (id: string) => survey?.options.find((o) => o.id === id)?.name || '';

  const OptionButton = ({ opt }: { opt: Option }) => {
    const rank = picks.indexOf(opt.id);
    const selected = rank >= 0;
    return (
      <button
        key={opt.id}
        type="button"
        onClick={() => togglePick(opt.id)}
        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
          selected
            ? 'border-[#00D1FF] bg-[#00D1FF]/15'
            : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
        }`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
            selected ? 'bg-[#00D1FF] text-black' : 'bg-white/10 text-white/40'
          }`}
        >
          {selected ? rank + 1 : ''}
        </span>
        <span className="flex-1 text-lg font-bold tracking-tight">{opt.name}</span>
        {opt.source === 'community' && (
          <span className="rounded-full bg-[#FF8A00]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FF8A00]">
            Público
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#07070c] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,209,255,0.14),_transparent_55%)]" />

      <header className="relative z-10 mx-auto flex max-w-lg items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00D1FF]">
            <Box className="h-4 w-4 text-black" />
          </div>
          <span className="text-lg font-black tracking-tight">
            Catagce<span className="text-[#00D1FF]">.</span>
          </span>
        </Link>
        <span className="text-xs text-white/40">Tu voz cuenta</span>
      </header>

      <main className="relative z-10 mx-auto max-w-lg px-5 pb-16">
        {!thanks && (
          <>
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#00D1FF]">
              <Sparkles className="h-3.5 w-3.5" /> Encuesta rápida
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              ¿Cómo debería llamarse?
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Elige 3 nombres en orden (oficiales o sugeridos por la comunidad).
              Gracias por ayudarnos — toma menos de 20 segundos.
            </p>
          </>
        )}

        {loading && (
          <div className="mt-10 space-y-3" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
            <button type="button" onClick={() => void load()} className="ml-2 underline">
              Reintentar
            </button>
          </div>
        )}

        {thanks && (
          <section className="mt-8 rounded-3xl border border-[#00D1FF]/25 bg-[#00D1FF]/10 p-6 text-center">
            <Heart className="mx-auto mb-3 h-8 w-8 text-[#00D1FF]" />
            <h2 className="text-2xl font-black tracking-tight">¡Gracias!</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Tu voto ya está contando. Estamos construyendo Catagce con personas como tú.
            </p>
          </section>
        )}

        {!loading && survey?.isOpen && !voted && (
          <section className="mt-8 space-y-5">
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Propuestos</p>
              {official.map((opt) => (
                <OptionButton key={opt.id} opt={opt} />
              ))}
            </div>

            {community.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8A00]/90">
                  Sugeridos por el público — también puedes elegirlos
                </p>
                {community.map((opt) => (
                  <OptionButton key={opt.id} opt={opt} />
                ))}
              </div>
            )}

            {picks.length > 0 && (
              <p className="text-xs text-white/45">
                {picks.map((id, i) => `${i + 1}º ${nameOf(id)}`).join(' · ')}
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-xs text-white/45">
                ¿Falta un nombre? Agrégalo (queda disponible para todos)
              </label>
              <input
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                maxLength={40}
                placeholder="Tu idea…"
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none placeholder:text-white/30 focus:border-[#00D1FF]"
              />
            </div>

            <button
              type="button"
              onClick={() => void submitVote()}
              disabled={picks.length !== 3 || saving}
              className="w-full rounded-2xl bg-[#00D1FF] py-3.5 text-base font-black text-black disabled:opacity-40"
            >
              {saving ? 'Enviando…' : 'Enviar mi voto'}
            </button>
          </section>
        )}

        {!loading && (voted || (survey && !survey.isOpen)) && stats && (
          <section className="mt-8">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-white/45">
              Resultados en vivo
            </h2>
            <p className="mb-4 text-xs text-white/35">{stats.totalVotes} votos</p>
            <div className="space-y-2">
              {stats.ranking.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <span className="w-5 font-black text-[#00D1FF]">{i + 1}</span>
                  <span className="flex-1 font-semibold">{r.name}</span>
                  {r.source === 'community' && (
                    <span className="text-[10px] uppercase text-[#FF8A00]">público</span>
                  )}
                  <span className="text-xs text-white/40">{r.points} pts</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && !survey && !error && (
          <p className="mt-8 text-sm text-white/50">La encuesta no está disponible ahora.</p>
        )}
      </main>
    </div>
  );
}
