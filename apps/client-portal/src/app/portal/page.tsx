'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PortalLayout from '../../components/PortalLayout';
import { apiFetch } from '../../lib/api';

export default function PortalHomePage() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    apiFetch('/portal/me').then(setProfile).catch(() => window.location.href = '/login');
  }, []);

  return (
    <PortalLayout>
      <h2 className="text-2xl font-bold">Bienvenido, {profile?.client?.name}</h2>
      <p className="text-slate-500 mt-1">Código: {profile?.client?.code}</p>

      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <div className="card p-6">
          <p className="text-sm text-slate-500">Saldo pendiente</p>
          <p className="text-3xl font-bold text-blue-700 mt-2">${parseFloat(profile?.balanceDue || '0').toFixed(2)}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-slate-500">Límite de crédito</p>
          <p className="text-3xl font-bold mt-2">${parseFloat(profile?.client?.creditLimit || '0').toFixed(2)}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm text-slate-500">Plazo crédito</p>
          <p className="text-3xl font-bold mt-2">{profile?.client?.creditDays || 30} días</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <Link href="/portal/invoices" className="card p-5 hover:border-blue-400 transition">
          <p className="font-semibold text-blue-700">Ver mis facturas →</p>
          <p className="text-sm text-slate-500 mt-1">Historial completo y detalle de pagos</p>
        </Link>
        <Link href="/portal/dispatches" className="card p-5 hover:border-blue-400 transition">
          <p className="font-semibold text-blue-700">Ver mis despachos →</p>
          <p className="text-sm text-slate-500 mt-1">Entregas realizadas y fechas</p>
        </Link>
      </div>
    </PortalLayout>
  );
}
