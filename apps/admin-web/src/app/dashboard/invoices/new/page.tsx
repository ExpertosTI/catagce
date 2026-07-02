import { Suspense } from 'react';
import NewInvoiceForm from './NewInvoiceForm';

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">🧾 Cargando formulario...</div>}>
      <NewInvoiceForm />
    </Suspense>
  );
}
