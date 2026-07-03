'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight, BookOpen, LogIn, Shield, Phone, Mail, ShoppingBag,
} from 'lucide-react';
import { publicFetch } from '../lib/api';
import { ADMIN_URL, COMPANY_SLUG } from '../lib/site';

type Company = { name: string; phone?: string; email?: string; logoUrl?: string };
type Catalog = { id: string; name: string; slug: string; description?: string; isPresale?: boolean };

export default function LandingPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);

  useEffect(() => {
    publicFetch<Company>(`/public/company/${COMPANY_SLUG}`).then(setCompany).catch(() => null);
    publicFetch<Catalog[]>(`/public/company/${COMPANY_SLUG}/catalogs`)
      .then(setCatalogs)
      .catch(() => setCatalogs([]));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-3">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-extrabold shadow-sm">
              G
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{company?.name || 'General Home'}</p>
            <p className="text-xs text-slate-500">Santo Domingo, República Dominicana</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-6 py-10 sm:py-14">
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Acceso a su cuenta
          </h1>
          <p className="text-slate-600 mt-3 text-sm leading-relaxed">
            Consulte facturas, mercancía pendiente y despachos. Haga pedidos desde nuestros catálogos de preventa.
          </p>
        </div>

        <div className="space-y-3 mb-10">
          <Link href="/login" className="btn-primary w-full text-center flex items-center justify-center gap-2 py-3.5">
            <LogIn size={18} /> Entrar como cliente
          </Link>
          <a href={`${ADMIN_URL}/login`} className="btn-secondary w-full text-center flex items-center justify-center gap-2 py-3.5">
            <Shield size={18} /> Acceso administrador
          </a>
        </div>

        {catalogs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600" /> Catálogos públicos
            </h2>
            <div className="space-y-2">
              {catalogs.map((c) => (
                <Link
                  key={c.id}
                  href={`/catalogo/${c.slug}`}
                  className="executive-card flex items-center gap-3 group hover:shadow-md transition-all hover:-translate-y-px !p-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600 group-hover:bg-blue-100 transition">
                    {c.isPresale ? <ShoppingBag size={18} /> : <BookOpen size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                    {c.description && <p className="text-xs text-slate-500 truncate">{c.description}</p>}
                    {c.isPresale && <span className="badge-amber text-[10px] mt-1 inline-flex">Preventa</span>}
                  </div>
                  <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-600 shrink-0 transition" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {(company?.phone || company?.email) && (
          <div className="text-sm text-slate-500 space-y-2 p-4 rounded-2xl bg-white/80 border border-slate-200/80">
            {company.phone && (
              <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {company.phone}</p>
            )}
            {company.email && (
              <p className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {company.email}</p>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200/80 py-6 text-center text-sm text-slate-500 bg-white/50">
        © 2026 {company?.name || 'General Home'} · Desarrollado por{' '}
        <a href="https://renace.tech" className="text-blue-700 font-medium hover:underline">renace.tech</a>
      </footer>
    </div>
  );
}
