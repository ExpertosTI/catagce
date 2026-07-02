export const PORTAL_PAGE = {
  home: { emoji: '🏠', title: 'Acceso a su cuenta' },
  dashboard: { emoji: '📊', title: 'Mi cuenta' },
  invoices: { emoji: '🧾', title: 'Facturas', subtitle: 'Consulte, comparta y descargue en PDF' },
  pending: { emoji: '📦', title: 'Mercancía pendiente de despacho', subtitle: 'Productos facturados que aún están en nuestro almacén' },
  dispatches: { emoji: '🚚', title: 'Historial de despachos', subtitle: 'Todas las entregas de mercancía realizadas a su negocio' },
  catalog: { emoji: '📚', title: 'Catálogo' },
  login: { emoji: '🔐', title: 'Portal de clientes', registerTitle: '✨ Registro de cliente', subtitle: 'Acceda a facturas, despachos y catálogos' },
} as const;

export const PORTAL_NAV = [
  { href: '/portal/invoices', emoji: '🧾', label: 'Mis facturas' },
  { href: '/portal/dispatches', emoji: '🚚', label: 'Mis despachos' },
  { href: '/portal/pending', emoji: '📦', label: 'Mercancía pendiente' },
  { href: '/catalogo', emoji: '📚', label: 'Catálogo', dynamic: true },
] as const;
