import { Suspense } from 'react';
import ClientDetailPage from './ClientDetailPage';
import DashboardLayout from '../../../../components/DashboardLayout';

export default function ClientDetailRoute({ params }: { params: { id: string } }) {
  return (
    <Suspense
      fallback={(
        <DashboardLayout>
          <div className="animate-pulse space-y-4 p-4">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="h-32 bg-slate-100 rounded-2xl" />
          </div>
        </DashboardLayout>
      )}
    >
      <ClientDetailPage params={params} />
    </Suspense>
  );
}
