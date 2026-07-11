import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Catagce | Catálogos y pedidos por WhatsApp",
  description: "Comparte catálogos, recibe pedidos sincronizados en Inbox, difusión con pausa y avisos al admin. El sistema B2B de Renace.tech.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
