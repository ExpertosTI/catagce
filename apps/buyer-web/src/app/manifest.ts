import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Catagce',
    short_name: 'Catagce',
    description: 'Catálogos, pedidos y difusión WhatsApp B2B',
    start_url: '/dashboard/difusion',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    categories: ['business', 'productivity'],
    lang: 'es',
    icons: [
      {
        src: '/icons/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Difusión',
        short_name: 'Difusión',
        description: 'Campañas y listas WhatsApp',
        url: '/dashboard/difusion',
        icons: [{ src: '/icons/icon-192', sizes: '192x192' }],
      },
      {
        name: 'Pedidos',
        short_name: 'Pedidos',
        url: '/dashboard/orders',
        icons: [{ src: '/icons/icon-192', sizes: '192x192' }],
      },
      {
        name: 'Inbox',
        short_name: 'Inbox',
        url: '/dashboard/whatsapp',
        icons: [{ src: '/icons/icon-192', sizes: '192x192' }],
      },
    ],
  };
}
