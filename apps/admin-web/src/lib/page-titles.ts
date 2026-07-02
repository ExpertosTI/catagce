/** Títulos con emoji para navegación y encabezados de página */
export const PAGE = {
  dashboard: { emoji: '🏠', title: 'Panel', subtitle: 'Resumen operativo de importación' },
  clients: { emoji: '👥', title: 'Clientes', subtitle: 'Gestión y aprobación de registros' },
  clientsNew: { emoji: '✨', title: 'Nuevo cliente', subtitle: 'Registre un cliente activo' },
  clientsEdit: { emoji: '✏️', title: 'Editar cliente', subtitle: 'Actualice los datos del cliente' },
  clientsNotFound: { emoji: '❌', title: 'Cliente no encontrado', subtitle: '' },
  products: { emoji: '📦', title: 'Mercancía', subtitle: 'Catálogo de productos importados' },
  productsNew: { emoji: '➕', title: 'Nuevo producto', subtitle: 'Agregue mercancía al catálogo' },
  productsEdit: { emoji: '✏️', title: 'Editar producto', subtitle: 'Modifique datos, precio e inventario' },
  invoices: { emoji: '🧾', title: 'Facturas', subtitle: 'Gestión, compartir e imprimir' },
  invoicesNew: { emoji: '📝', title: 'Nueva factura', subtitle: 'Comprobante fiscal DGII con NCF e ITBIS' },
  invoicesNotFound: { emoji: '❌', title: 'Factura no encontrada', subtitle: '' },
  payments: { emoji: '💰', title: 'Pagos', subtitle: 'Abonos y cobros registrados' },
  dispatches: { emoji: '🚚', title: 'Despachos', subtitle: 'Pendientes e historial' },
  dispatchesNew: { emoji: '📤', title: 'Registrar despacho', subtitle: 'Entrega parcial de mercancía al cliente' },
  presales: { emoji: '🛒', title: 'Preventas', subtitle: 'Pedidos de clientes desde catálogos' },
  imports: { emoji: '🚢', title: 'Importaciones', subtitle: 'Contenedores y recepción de mercancía' },
  importsNew: { emoji: '📥', title: 'Nueva importación', subtitle: 'Registre un contenedor en camino' },
  catalogs: { emoji: '📚', title: 'Catálogos', subtitle: 'Preventas y catálogos públicos' },
  catalogsNew: { emoji: '🆕', title: 'Nuevo catálogo', subtitle: 'Catálogo público de preventa para sus clientes' },
  reports: { emoji: '📊', title: 'Reportes', subtitle: 'Cuentas por cobrar, ventas e inventario' },
  settings: { emoji: '⚙️', title: 'Configuración', subtitle: 'Datos, marca y secuencias fiscales' },
  login: { emoji: '🔐', title: 'Iniciar sesión', subtitle: 'Panel de administración GHome' },
} as const;

export const NAV_ITEMS = [
  { href: '/dashboard', emoji: '🏠', label: 'Inicio' },
  { href: '/dashboard/clients', emoji: '👥', label: 'Clientes' },
  { href: '/dashboard/products', emoji: '📦', label: 'Mercancía' },
  { href: '/dashboard/invoices', emoji: '🧾', label: 'Facturas' },
  { href: '/dashboard/payments', emoji: '💰', label: 'Pagos' },
  { href: '/dashboard/dispatches', emoji: '🚚', label: 'Despachos' },
  { href: '/dashboard/presales', emoji: '🛒', label: 'Preventas' },
  { href: '/dashboard/imports', emoji: '🚢', label: 'Importaciones' },
  { href: '/dashboard/catalogs', emoji: '📚', label: 'Catálogos' },
  { href: '/dashboard/reports', emoji: '📊', label: 'Reportes' },
  { href: '/dashboard/settings', emoji: '⚙️', label: 'Configuración' },
] as const;

export const DASHBOARD_STATS = [
  { emoji: '🧾', label: 'Facturas emitidas', key: 'invoices' as const },
  { emoji: '💳', label: 'Cuentas por cobrar', key: 'credit' as const },
  { emoji: '🚚', label: 'Despachos pendientes', key: 'dispatchCount' as const },
  { emoji: '📦', label: 'Unidades por despachar', key: 'dispatchUnits' as const },
  { emoji: '🏭', label: 'Mercancía en almacén', key: 'stock' as const },
  { emoji: '👥', label: 'Clientes activos', key: 'clients' as const },
];

export const REPORT_TABS = [
  { id: 'ar' as const, emoji: '💳', label: 'Cuentas por cobrar' },
  { id: 'sales' as const, emoji: '📈', label: 'Ventas' },
  { id: 'inventory' as const, emoji: '📦', label: 'Inventario' },
];
