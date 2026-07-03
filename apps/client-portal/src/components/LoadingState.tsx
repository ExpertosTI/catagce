type Props = {
  message?: string;
};

export function LoadingState({ message = 'Cargando...' }: Props) {
  return (
    <p className="text-center text-slate-500 py-12">{message}</p>
  );
}
