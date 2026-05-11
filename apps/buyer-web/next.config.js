/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Aseguramos que Next.js pueda manejar los assets estáticos correctamente en Docker
  output: 'standalone', 
  // Nota: Aunque usemos Zero-Build, 'standalone' ayuda a Next a entender la estructura de archivos
  // Pero para nuestro flujo actual, mantendremos la configuración básica para que 'next start' funcione.
};

module.exports = nextConfig;
