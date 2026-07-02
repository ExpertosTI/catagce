type Props = {
  emoji?: string;
  message?: string;
};

export function LoadingState({ emoji = '⏳', message = 'Cargando...' }: Props) {
  return (
    <p className="text-center text-slate-400 py-12">
      <span className="text-2xl block mb-2" aria-hidden>{emoji}</span>
      {message}
    </p>
  );
}
