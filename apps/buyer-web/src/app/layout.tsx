import type { Metadata } from "next";
import "./globals.css";
// next/font/google removed to prevent build failures in offline environments


export const metadata: Metadata = {
  title: "Catagce | B2B Catalog Sales Operating System",
  description: "Transform your inventory into a high-converting sales channel with branded catalogs and zero-login ordering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@100..900&family=Rajdhani:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
