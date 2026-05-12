import { headers } from 'next/headers';
import MarketingLanding from './marketing-landing';
import DashboardPage from './dashboard/page';

export default function DispatcherPage() {
  const headersList = headers();
  const host = headersList.get('host') || '';

  // Si entramos por el dominio de Jhosua Comercial, vamos directo al Dashboard (Login)
  if (host.includes('jhosuacomercial.com')) {
    return <DashboardPage />;
  }

  // Para catagce.renace.tech o cualquier otro, mostramos la Landing
  return <MarketingLanding host={host} />;
}
