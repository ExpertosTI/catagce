'use client';

import DashboardLayout, { PageHeader } from '../../../components/DashboardLayout';
import { SITE_URL, ADMIN_URL } from '../../../lib/site';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <PageHeader title="Configuración" subtitle="Datos de GHome Importaciones" />
      <div className="card p-6 max-w-lg space-y-4">
        <div>
          <p className="text-sm text-slate-500">Empresa</p>
          <p className="font-semibold text-lg">GHome Importaciones</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Slug portal</p>
          <p className="font-mono text-blue-700">generalhome</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Panel admin</p>
          <a href={ADMIN_URL} className="text-blue-700 hover:underline">{ADMIN_URL}</a>
        </div>
        <div>
          <p className="text-sm text-slate-500">Sitio público</p>
          <a href={SITE_URL} className="text-blue-700 hover:underline">{SITE_URL}</a>
        </div>
        <div>
          <p className="text-sm text-slate-500">Colores corporativos</p>
          <div className="flex gap-2 mt-2">
            <div className="w-10 h-10 rounded bg-blue-700 border" title="Azul corporativo" />
            <div className="w-10 h-10 rounded bg-white border" title="Blanco" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
