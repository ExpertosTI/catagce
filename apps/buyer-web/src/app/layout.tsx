import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { PwaRegister } from '@/components/PwaRegister';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Catagce | Catálogos y pedidos por WhatsApp',
  description:
    'Comparte catálogos, recibe pedidos sincronizados en Inbox, difusión con pausa y avisos al admin. El sistema B2B de Renace.tech.',
  applicationName: 'Catagce',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Catagce',
  },
  formatDetection: { telephone: false },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
    { media: '(prefers-color-scheme: light)', color: '#0A0A0A' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={`${inter.className} overscroll-none`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
