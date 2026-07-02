'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { publicFetch } from '../lib/api';
import { ADMIN_URL, COMPANY_SLUG } from '../lib/site';
import { PORTAL_PAGE } from '../lib/page-titles';

type Company = { name: string; phone?: string; email?: string };

export default function LandingPage() {
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    publicFetch<Company>(`/public/company/${COMPANY_SLUG}`).then(setCompany).catch(() => null);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-lg mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold">G</div>
          <div>
            <p className="font-bold text-slate-900">{company?.name || 'General Home'}</p>
            <p className="text-xs text-slate-500">Santo Domingo, República Dominicana</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-6 py-16 flex flex-col justify-center">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <span aria-hidden>{PORTAL_PAGE.home.emoji}</span> {PORTAL_PAGE.home.title}
        </h1>
        <p className="text-slate-600 mt-2 text-sm leading-relaxed">
          Consulte facturas, inventario y pedidos. Sin distracciones — directo a lo que necesita.
        </p>

        <div className="mt-10 space-y-3">
          <Link href="/login" className="btn-primary w-full text-center block py-3">
            Entrar como cliente
          </Link>
          <a href={`${ADMIN_URL}/login`} className="btn-outline w-full text-center block py-3">
            Acceso administrador
          </a>
        </div>

        {(company?.phone || company?.email) && (
          <div className="mt-12 text-sm text-slate-500 space-y-1">
            {company.phone && <p>{company.phone}</p>}
            {company.email && <p>{company.email}</p>}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        © 2026 {company?.name || 'General Home'} · Desarrollado por{' '}
        <a href="https://renace.tech" className="text-blue-700 font-medium">renace.tech</a>
      </footer>
    </div>
  );
}
