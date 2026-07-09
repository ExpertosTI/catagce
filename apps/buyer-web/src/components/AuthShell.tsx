'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Box, Sparkles, MessageCircle, BarChart3 } from 'lucide-react';

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

const perks = [
  { icon: MessageCircle, text: 'Pedidos por WhatsApp en 2 clics' },
  { icon: BarChart3, text: 'Inventario y catálogos en tiempo real' },
  { icon: Sparkles, text: 'Onboarding guiado con IA' },
];

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-hidden">
      {/* Ambient depth */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-[#00D1FF]/20 blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full bg-[#FF8A00]/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-[380px] h-[380px] rounded-full bg-[#00D1FF]/10 blur-[90px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_50%,transparent_100%)]" />
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1fr_1.05fr]">
        {/* Brand panel */}
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex flex-col justify-between p-12 xl:p-16 border-r border-white/10"
        >
          <div>
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 bg-[#00D1FF] rounded-xl flex items-center justify-center shadow-[0_0_40px_rgba(0,209,255,0.35)] group-hover:rotate-6 transition-transform">
                <Box className="w-7 h-7 text-black" />
              </div>
              <span className="text-2xl font-black tracking-tighter">
                CATAGCE<span className="text-[#00D1FF]">.</span>
              </span>
            </Link>

            <h2 className="mt-16 text-4xl xl:text-5xl font-black tracking-tighter leading-[0.95]">
              Tu canal B2B
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D1FF] to-white">
                listo para vender.
              </span>
            </h2>
            <p className="mt-6 text-gray-400 text-lg max-w-md leading-relaxed">
              Catálogos interactivos, pedidos sin fricción y control total de inventario desde un solo panel.
            </p>

            <ul className="mt-10 space-y-4">
              {perks.map((p, i) => (
                <motion.li
                  key={p.text}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 text-sm text-gray-300"
                >
                  <span className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#00D1FF]">
                    <p.icon className="w-4 h-4" />
                  </span>
                  {p.text}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Floating preview card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative mt-8"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-[#00D1FF]/40 to-[#FF8A00]/30 rounded-2xl blur-lg opacity-60" />
            <div className="relative rounded-2xl border border-white/15 bg-[#111]/80 backdrop-blur-xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00D1FF]">Live</span>
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
              <p className="text-2xl font-black tracking-tighter">+24 pedidos</p>
              <p className="text-xs text-gray-500 mt-1">esta semana vía WhatsApp</p>
              <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-[#00D1FF] to-[#FF8A00] rounded-full" />
              </div>
            </div>
          </motion.div>
        </motion.aside>

        {/* Form panel */}
        <div className="flex flex-col items-center justify-center px-4 py-10 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-[440px]"
          >
            <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
              <div className="w-10 h-10 bg-[#00D1FF] rounded-xl flex items-center justify-center">
                <Box className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-black tracking-tighter">CATAGCE</span>
            </div>

            <div className="text-center lg:text-left mb-8">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-gray-400 mt-2">{subtitle}</p>}
            </div>

            <div className="relative">
              <div className="absolute -inset-px bg-gradient-to-b from-white/20 via-[#00D1FF]/20 to-transparent rounded-3xl" />
              <div className="relative rounded-3xl border border-white/10 bg-[#0c0c10]/90 backdrop-blur-2xl p-7 md:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
                {children}
              </div>
            </div>

            {footer && (
              <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function AuthInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-300 mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full h-12 px-4 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-gray-600 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50 focus:border-[#00D1FF]/50 transition shadow-inner"
      />
    </label>
  );
}

export function AuthButton({
  children,
  loading,
  disabled,
  type = 'submit',
  onClick,
}: {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full h-12 rounded-xl bg-[#00D1FF] hover:bg-[#00bce0] text-black font-bold text-[15px] shadow-[0_4px_24px_rgba(0,209,255,0.35)] hover:shadow-[0_6px_32px_rgba(0,209,255,0.45)] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
    >
      {children}
    </button>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-[#00D1FF] hover:text-white transition-colors">
      {children}
    </Link>
  );
}

export function AuthTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="relative flex gap-1 p-1 bg-white/5 rounded-xl mb-6 border border-white/10">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`relative flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors z-10 ${
            active === t.id ? 'text-black' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {active === t.id && (
            <motion.span
              layoutId="auth-tab-pill"
              className="absolute inset-0 bg-[#00D1FF] rounded-lg shadow-md"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
