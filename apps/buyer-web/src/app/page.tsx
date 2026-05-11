import { headers } from 'next/headers';
import MarketingLanding from './marketing-landing';
import DashboardPage from './dashboard/page';

export default function DispatcherPage() {
  const headersList = headers();
  const host = headersList.get('host') || '';

  // Solo mostramos la landing de marketing en el dominio raíz de renace.tech
  if (host === 'renace.tech' || host === 'www.renace.tech') {
    return <MarketingLanding />;
  }

  // Por defecto, para catalogo.jhosuacomercial.com y otros, mostramos la administración directa
  return <DashboardPage />;
}
