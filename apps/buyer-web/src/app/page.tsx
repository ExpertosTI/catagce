'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import {
  Box, ArrowRight, MessageCircle, Radio, Package, Warehouse,
  FileOutput, BookOpen, Send, ShoppingBag, Play, Users, Settings,
} from 'lucide-react';

const ORDER_STATUSES = [
  { key: 'submitted', label: 'Nuevo', color: '#00D1FF' },
  { key: 'reserved', label: 'Reservado', color: '#FF8A00' },
  { key: 'confirmed', label: 'Confirmado', color: '#22c55e' },
  { key: 'rejected', label: 'Rechazado', color: '#ef4444' },
] as const;

const FEATURES = [
  { id: 'catalogos', label: 'Catálogos', icon: BookOpen, accent: '#00D1FF' },
  { id: 'pedidos', label: 'Pedidos', icon: FileOutput, accent: '#FF8A00' },
  { id: 'inbox', label: 'Inbox', icon: MessageCircle, accent: '#25D366' },
  { id: 'difusion', label: 'Difusión', icon: Radio, accent: '#FF8A00' },
  { id: 'inventario', label: 'Inventario', icon: Package, accent: '#00D1FF' },
  { id: 'aviso', label: 'Aviso admin', icon: Send, accent: '#25D366' },
  { id: 'contactos', label: 'Contactos', icon: Users, accent: '#00D1FF' },
  { id: 'config', label: 'Config WA', icon: Settings, accent: '#25D366' },
] as const;

type FeatureId = (typeof FEATURES)[number]['id'];

export default function LandingPage() {
  const [feature, setFeature] = useState<FeatureId>('pedidos');
  const [statusIdx, setStatusIdx] = useState(0);
  const [inboxFilter, setInboxFilter] = useState<'pedidos' | 'todos'>('pedidos');
  const [difusionTab, setDifusionTab] = useState<'listas' | 'campanas'>('listas');
  const [inboxAction, setInboxAction] = useState<'idle' | 'ok' | 'no'>('idle');

  const active = FEATURES.find((f) => f.id === feature)!;

  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-[#00D1FF]/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-1/3 w-[560px] h-[560px] bg-[#00D1FF]/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[10%] right-0 w-[380px] h-[380px] bg-[#FF8A00]/08 rounded-full blur-[100px]" />
      </div>

      <header className="relative z-20 flex items-center justify-between px-5 md:px-10 py-5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00D1FF] rounded-lg flex items-center justify-center">
            <Box className="text-black w-4 h-4" />
          </div>
          <span className="text-lg font-black tracking-tight">
            Catagce<span className="text-[#00D1FF]">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="px-3 py-2 text-sm text-gray-400 hover:text-white">
            Entrar
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-[#00D1FF] text-black rounded-xl font-bold text-sm"
          >
            Empezar
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="px-5 md:px-10 pt-12 md:pt-20 pb-16 max-w-6xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#00D1FF] font-black text-5xl sm:text-6xl md:text-7xl tracking-tight mb-5"
          >
            Catagce<span className="text-white">.</span>
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-300 max-w-2xl mx-auto mb-4"
          >
            Catálogo, WhatsApp y pedidos en un solo flujo
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="text-gray-500 text-sm sm:text-base max-w-md mx-auto mb-8"
          >
            Elige una función abajo y mira cómo se ve en la app.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#00D1FF] text-black rounded-xl font-bold hover:-translate-y-0.5 transition-transform"
            >
              Crear cuenta <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </section>

        {/* Visual feature picker */}
        <section id="funciones" className="px-5 md:px-10 pb-20 max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              const on = feature === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFeature(f.id);
                    setInboxAction('idle');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
                    on
                      ? 'border-transparent text-black'
                      : 'border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                  style={on ? { backgroundColor: f.accent } : undefined}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0c0c10]/95 overflow-hidden max-w-xl mx-auto">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: active.accent }}
              />
              <span className="text-sm font-bold">{active.label}</span>
              <span className="text-[10px] text-gray-600 ml-auto">Demo interactiva</span>
            </div>

            <div className="p-4 min-h-[280px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {feature === 'catalogos' && <DemoCatalogos />}
                  {feature === 'pedidos' && (
                    <DemoPedidos statusIdx={statusIdx} setStatusIdx={setStatusIdx} />
                  )}
                  {feature === 'inbox' && (
                    <DemoInbox
                      filter={inboxFilter}
                      setFilter={setInboxFilter}
                      action={inboxAction}
                      setAction={setInboxAction}
                    />
                  )}
                  {feature === 'difusion' && (
                    <DemoDifusion tab={difusionTab} setTab={setDifusionTab} />
                  )}
                  {feature === 'inventario' && <DemoInventario />}
                  {feature === 'aviso' && <DemoAviso />}
                  {feature === 'contactos' && <DemoContactos />}
                  {feature === 'config' && <DemoConfig />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Flow — lean */}
        <section className="px-5 md:px-10 py-16 max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6 text-center sm:text-left">
            {[
              { n: '1', t: 'Compartes', d: 'Catálogo o difusión por WhatsApp' },
              { n: '2', t: 'Cliente pide', d: 'Enlace → pedido en la app al instante' },
              { n: '3', t: 'Gestionas', d: 'Inbox + estados + aviso al admin' },
            ].map((s) => (
              <div key={s.n}>
                <p className="text-[#00D1FF] font-black text-2xl mb-1">{s.n}</p>
                <p className="font-bold mb-1">{s.t}</p>
                <p className="text-sm text-gray-500">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 md:px-10 py-20 max-w-6xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3">
            Listo para vender por WhatsApp
          </h2>
          <p className="text-gray-500 text-sm mb-8">Onboarding guiado · Tu número · Pedidos sincronizados</p>
          <Link
            href="/register"
            className="inline-flex px-8 py-3.5 bg-[#00D1FF] text-black rounded-xl font-black"
          >
            Crear Catagce gratis
          </Link>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="font-black tracking-tight flex items-center gap-2">
            <Box className="w-4 h-4 text-[#00D1FF]" /> Catagce.
          </span>
          <p className="text-[10px] uppercase tracking-widest text-gray-600">
            © 2026 Renace.tech
          </p>
        </div>
      </footer>
    </div>
  );
}

function DemoCatalogos() {
  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
        <span className="font-semibold">Mayorista 2026</span>
        <span className="text-[#00D1FF] text-[10px] font-bold">Publicado</span>
      </div>
      <div className="p-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/25 leading-relaxed">
        ¡Hola! Te comparto nuestro catálogo.
        <br />
        <span className="text-[#00D1FF]">catagce.renace.tech/order/…</span>
      </div>
      <div className="w-full py-2.5 rounded-xl bg-[#25D366] text-black text-center font-bold flex items-center justify-center gap-1.5">
        <MessageCircle className="w-3.5 h-3.5" /> Compartir por WhatsApp
      </div>
    </div>
  );
}

function DemoPedidos({
  statusIdx,
  setStatusIdx,
}: {
  statusIdx: number;
  setStatusIdx: (i: number) => void;
}) {
  const s = ORDER_STATUSES[statusIdx];
  return (
    <div className="space-y-3 text-xs">
      <p className="text-[10px] text-gray-500">Elige el estado</p>
      <div className="flex flex-wrap gap-1.5">
        {ORDER_STATUSES.map((st, i) => (
          <button
            key={st.key}
            type="button"
            onClick={() => setStatusIdx(i)}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
            style={{
              color: st.color,
              borderColor: statusIdx === i ? st.color : 'rgba(255,255,255,0.1)',
              backgroundColor: statusIdx === i ? `${st.color}22` : 'transparent',
            }}
          >
            {st.label}
          </button>
        ))}
      </div>
      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
        <div className="flex flex-wrap gap-2 mb-2">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: `${s.color}22`, color: s.color }}
          >
            {s.label}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#25D366]/15 text-[#25D366] font-semibold">
            WhatsApp link
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold">AMARTE</p>
            <p className="text-[10px] text-gray-500 font-mono">#06f57375</p>
          </div>
          <p className="text-lg font-black text-[#00D1FF]">$160</p>
        </div>
      </div>
    </div>
  );
}

function DemoInbox({
  filter,
  setFilter,
  action,
  setAction,
}: {
  filter: 'pedidos' | 'todos';
  setFilter: (f: 'pedidos' | 'todos') => void;
  action: 'idle' | 'ok' | 'no';
  setAction: (a: 'idle' | 'ok' | 'no') => void;
}) {
  return (
    <div className="space-y-3 text-xs">
      <div className="flex gap-2">
        {(['pedidos', 'todos'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              filter === f ? 'bg-[#25D366] text-black' : 'border border-white/10 text-gray-500'
            }`}
          >
            {f === 'pedidos' ? 'Pedidos WA' : 'Todos'}
          </button>
        ))}
      </div>
      <div className="p-3 rounded-xl border border-[#25D366]/35 bg-[#25D366]/5">
        <div className="flex justify-between">
          <p className="font-bold">AMARTE</p>
          {filter === 'pedidos' && (
            <span className="bg-[#25D366] text-black text-[9px] font-bold px-1.5 rounded-full">1</span>
          )}
        </div>
        <p className="text-[10px] text-[#25D366] font-semibold mt-1">Pedido #06f57375 · $160</p>
      </div>
      {action === 'idle' ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAction('ok')}
            className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-400 font-bold text-[10px]"
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={() => setAction('no')}
            className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 font-bold text-[10px]"
          >
            Rechazar
          </button>
        </div>
      ) : (
        <p className={`text-center text-[11px] font-bold ${action === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
          {action === 'ok' ? 'Pedido confirmado' : 'Pedido rechazado'}
          <button type="button" onClick={() => setAction('idle')} className="ml-2 text-gray-500 underline font-normal">
            reset
          </button>
        </p>
      )}
    </div>
  );
}

function DemoDifusion({
  tab,
  setTab,
}: {
  tab: 'listas' | 'campanas';
  setTab: (t: 'listas' | 'campanas') => void;
}) {
  return (
    <div className="space-y-3 text-xs">
      <div className="flex gap-2">
        {(['listas', 'campanas'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
              tab === t ? 'bg-[#FF8A00] text-black' : 'bg-white/5 text-gray-500'
            }`}
          >
            {t === 'listas' ? 'Listas' : 'Campañas'}
          </button>
        ))}
      </div>
      {tab === 'listas' ? (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <p className="font-semibold">Clientes VIP</p>
          <p className="text-[10px] text-gray-500">24 contactos</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-black/40 border border-white/10">
              <p className="text-[9px] text-gray-500">Pausa min</p>
              <p className="font-bold">45 s</p>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/10">
              <p className="text-[9px] text-gray-500">Pausa max</p>
              <p className="font-bold">90 s</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[#00D1FF]">
            <Play className="w-3 h-3" /> 8/24 enviados
          </div>
        </div>
      )}
    </div>
  );
}

function DemoInventario() {
  return (
    <div className="space-y-2 text-xs">
      {[
        { n: 'Camiseta polo', s: 48, ok: true },
        { n: 'Loción 250ml', s: 4, ok: false },
        { n: 'Gorra snapback', s: 22, ok: true },
      ].map((p) => (
        <div key={p.n} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <Warehouse className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-semibold">{p.n}</span>
          </div>
          <span className={`text-[10px] font-bold ${p.ok ? 'text-[#00D1FF]' : 'text-[#FF8A00]'}`}>
            Stock {p.s}
          </span>
        </div>
      ))}
    </div>
  );
}

function DemoAviso() {
  return (
    <div className="p-3 rounded-xl bg-[#0b1410] border border-[#25D366]/25 text-[11px] leading-relaxed space-y-1">
      <p className="font-bold text-[#25D366]">Nuevo pedido Catagce</p>
      <p className="text-gray-300">Cliente: AMARTE</p>
      <p className="text-gray-300">Total: $160.00</p>
      <p className="font-mono text-gray-400">Ref: #06f57375</p>
      <p className="text-[#00D1FF]">/dashboard/orders</p>
    </div>
  );
}

function DemoContactos() {
  return (
    <div className="space-y-2 text-xs">
      {['AMARTE', 'Distribuidora Norte', 'Boutique Sol'].map((n, i) => (
        <div key={n} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="w-8 h-8 rounded-full bg-[#00D1FF]/20 flex items-center justify-center text-[10px] font-bold text-[#00D1FF]">
            {n.slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold">{n}</p>
            <p className="text-[10px] text-gray-500">1849…{100 + i}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoConfig() {
  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#25D366]" />
          <span className="font-semibold">WhatsApp negocio</span>
        </div>
        <span className="text-[10px] font-bold text-[#25D366]">Conectado</span>
      </div>
      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <p className="text-[10px] text-gray-500 mb-1">Aviso pedidos al admin</p>
        <p className="font-mono text-sm">+1 849 ··· ····</p>
      </div>
      <div className="flex items-center gap-2 p-2.5 rounded-xl border border-[#00D1FF]/20 bg-[#00D1FF]/5">
        <ShoppingBag className="w-3.5 h-3.5 text-[#00D1FF]" />
        <span className="text-[10px] text-gray-400">Webhook Evolution activo</span>
      </div>
    </div>
  );
}
