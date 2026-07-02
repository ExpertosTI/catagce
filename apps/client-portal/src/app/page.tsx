'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Ship, Package, FileText, Truck, Shield, ArrowRight, Phone, Mail } from 'lucide-react';
import { publicFetch } from '../lib/api';
import { ADMIN_URL, COMPANY_SLUG } from '../lib/site';

const COMPANY_SLUG_CONST = COMPANY_SLUG;

type Company = { name: string; phone?: string; email?: string; address?: string; logoUrl?: string };
type Catalog = { slug: string; name: string; description?: string; isPresale?: boolean; coverImageUrl?: string };

export default function LandingPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);

  useEffect(() => {
    publicFetch<Company>(`/public/company/${COMPANY_SLUG_CONST}`).then(setCompany).catch(console.error);
    publicFetch<Catalog[]>(`/public/company/${COMPANY_SLUG_CONST}/catalogs`).then(setCatalogs).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold">G</div>
            <div>
              <p className="font-bold text-slate-900">{company?.name || 'GHome Importaciones'}</p>
              <p className="text-xs text-slate-500">Importación · Distribución · Crédito</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#servicios" className="hover:text-blue-700">Servicios</a>
            <a href="#catalogo" className="hover:text-blue-700">Catálogo</a>
            <a href="#contacto" className="hover:text-blue-700">Contacto</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-outline text-sm py-2">Portal clientes</Link>
            <a href={`${ADMIN_URL}/login`} className="btn-primary text-sm py-2 hidden sm:inline-flex">Acceso admin</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="badge-blue bg-blue-500/30 text-blue-100 border border-blue-400/30 mb-4 inline-block">Empresa importadora</span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Mercancía importada con facturación, crédito y despacho parcial
            </h1>
            <p className="mt-6 text-blue-100 text-lg leading-relaxed">
              Compre al por mayor electrodomésticos y más. Facturamos a crédito, despachamos por partes
              y su mercancía restante queda segura en nuestro almacén hasta que la retire.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/catalogo/preventa-marzo-2026" className="inline-flex items-center gap-2 bg-white text-blue-800 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition">
                Ver catálogo <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 border border-white/40 text-white font-medium px-6 py-3 rounded-lg hover:bg-white/10 transition">
                Registrarse como cliente
              </Link>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-4">
            {[
              { icon: Ship, label: 'Importaciones', desc: 'Contenedores directos' },
              { icon: FileText, label: 'Facturación', desc: 'Contado y crédito' },
              { icon: Truck, label: 'Despacho parcial', desc: 'Retire cuando quiera' },
              { icon: Package, label: 'Almacén seguro', desc: 'Mercancía reservada' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-5">
                <Icon className="text-blue-200 mb-3" size={28} />
                <p className="font-semibold">{label}</p>
                <p className="text-sm text-blue-200 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="section-title text-center">Todo lo que necesita su negocio</h2>
        <p className="section-subtitle text-center max-w-2xl mx-auto">Plataforma integral para distribuidores mayoristas</p>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            { title: 'Preventa y catálogos', desc: 'Reserve mercancía en tránsito antes de que llegue al país.' },
            { title: 'Facturas a crédito', desc: 'Plazos flexibles con seguimiento de abonos y saldo pendiente.' },
            { title: 'Despachos parciales', desc: 'Reciba lo que necesita hoy; el resto queda en nuestro almacén.' },
            { title: 'Portal de clientes', desc: 'Consulte facturas, pagos y mercancía pendiente 24/7.' },
            { title: 'Historial de despachos', desc: 'Transparencia total en cada entrega realizada.' },
            { title: 'E-commerce mayorista', desc: 'Catálogo visual con precios y pedido en línea.' },
          ].map((s) => (
            <div key={s.title} className="card p-6 hover:border-blue-300 transition">
              <Shield className="text-blue-700 mb-3" size={24} />
              <h3 className="font-semibold text-lg">{s.title}</h3>
              <p className="text-slate-600 mt-2 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Catálogos */}
      <section id="catalogo" className="bg-slate-50 border-y border-slate-200 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="section-title">Catálogos disponibles</h2>
          <p className="section-subtitle">Explore nuestra mercancía y haga su preventa en línea</p>
          <div className="mt-10 grid md:grid-cols-2 gap-6">
            {catalogs.map((cat) => (
              <Link key={cat.slug} href={`/catalogo/${cat.slug}`} className="card overflow-hidden hover:shadow-md transition group">
                {cat.coverImageUrl && (
                  <img src={cat.coverImageUrl} alt={cat.name} className="w-full h-48 object-cover group-hover:scale-[1.02] transition" />
                )}
                <div className="p-6">
                  <span className="badge-blue">{cat.isPresale ? 'Preventa' : 'Catálogo'}</span>
                  <h3 className="font-semibold text-xl mt-2">{cat.name}</h3>
                  <p className="text-slate-600 mt-2 text-sm">{cat.description}</p>
                  <p className="text-blue-700 font-medium mt-4 text-sm">Ver productos →</p>
                </div>
              </Link>
            ))}
            {!catalogs.length && (
              <div className="card p-8 col-span-2 text-center text-slate-500">Cargando catálogos...</div>
            )}
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="max-w-6xl mx-auto px-6 py-20">
        <div className="card p-10 md:flex items-center justify-between gap-8">
          <div>
            <h2 className="section-title">¿Listo para importar con nosotros?</h2>
            <p className="section-subtitle">Regístrese como cliente y acceda al portal mayorista</p>
          </div>
          <div className="space-y-3 text-sm text-slate-600 shrink-0">
            {company?.phone && <p className="flex items-center gap-2"><Phone size={16} className="text-blue-700" /> {company.phone}</p>}
            {company?.email && <p className="flex items-center gap-2"><Mail size={16} className="text-blue-700" /> {company.email}</p>}
            {company?.address && <p className="text-slate-500">{company.address}</p>}
            <Link href="/login" className="btn-primary inline-flex mt-4">Crear cuenta de cliente</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {company?.name || 'GHome Importaciones'}. Todos los derechos reservados.
      </footer>
    </div>
  );
}
