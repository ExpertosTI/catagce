import { Suspense } from 'react';
import NewInvoiceForm from './NewInvoiceForm';
import { LoadingState } from '../../../../components/LoadingState';

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<LoadingState message="Cargando formulario..." />}>
      <NewInvoiceForm />
    </Suspense>
  );
}
