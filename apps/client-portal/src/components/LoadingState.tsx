import { Loader2 } from 'lucide-react';

type Props = {
  message?: string;
};

export function LoadingState({ message = 'Cargando...' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <Loader2 size={28} className="animate-spin text-blue-600 mb-3" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
