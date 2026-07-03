import { Loader2 } from 'lucide-react';

type Props = {
  message?: string;
  className?: string;
};

export function LoadingState({ message = 'Cargando...', className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-gray-400 ${className}`}>
      <Loader2 size={28} className="animate-spin text-[#00D1FF] mb-3" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
