import { Suspense } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { LoadingState } from '../../../components/LoadingState';
import InvoicesPageContent from './InvoicesPageContent';

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={(
        <DashboardLayout>
          <LoadingState message="Cargando facturas..." />
        </DashboardLayout>
      )}
    >
      <InvoicesPageContent />
    </Suspense>
  );
}
