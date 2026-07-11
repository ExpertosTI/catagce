import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pedir por Catagce',
  description: 'Elige productos, confirma tu pedido y continúa por WhatsApp. Queda sincronizado con el vendedor.',
  openGraph: {
    title: 'Catálogo · Pedido WhatsApp',
    description: 'Haz tu pedido desde el enlace. Se registra automáticamente en Catagce.',
    type: 'website',
  },
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
