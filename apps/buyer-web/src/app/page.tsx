import { headers } from 'next/headers';
import MarketingLanding from './marketing-landing';
import DashboardPage from './dashboard/page';

export default function DispatcherPage() {
  const headersList = headers();
  const host = headersList.get('host') || '';

  // La landing cinematográfica ahora es la puerta de entrada global
  // con la opción de login integrada.
  return <MarketingLanding host={host} />;
}
