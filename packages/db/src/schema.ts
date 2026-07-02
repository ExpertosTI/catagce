import {
  pgTable, text, timestamp, integer, pgEnum, decimal, uuid, boolean, jsonb, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────
export const staffRoleEnum = pgEnum('staff_role', ['owner', 'admin', 'sales', 'warehouse', 'viewer']);
export const clientStatusEnum = pgEnum('client_status', ['pending', 'active', 'suspended']);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled',
]);
export const invoiceTypeEnum = pgEnum('invoice_type', ['cash', 'credit']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'transfer', 'card', 'check', 'other']);
export const dispatchStatusEnum = pgEnum('dispatch_status', ['pending', 'partial', 'completed', 'cancelled']);
export const presaleStatusEnum = pgEnum('presale_status', ['open', 'confirmed', 'converted', 'cancelled']);
export const orderRequestStatusEnum = pgEnum('order_request_status', [
  'pending_pricing', 'priced', 'confirmed', 'rejected', 'cancelled',
]);
export const quoteStatusEnum = pgEnum('quote_status', ['draft', 'sent', 'accepted', 'rejected', 'expired']);
export const importStatusEnum = pgEnum('import_status', ['in_transit', 'customs', 'received', 'closed']);
export const allocationStatusEnum = pgEnum('allocation_status', ['reserved', 'partially_dispatched', 'dispatched']);

// ─── Empresa importadora ─────────────────────────────────────────────────────
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  taxId: text('tax_id'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  logoUrl: text('logo_url'),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const staffUsers = pgTable('staff_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: staffRoleEnum('role').default('admin'),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  emailCompanyIdx: uniqueIndex('staff_users_email_company_idx').on(t.email, t.companyId),
}));

// ─── Clientes (portal) ───────────────────────────────────────────────────────
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  code: text('code'),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  phone: text('phone'),
  taxId: text('tax_id'),
  address: text('address'),
  creditLimit: decimal('credit_limit', { precision: 14, scale: 2 }).default('0'),
  creditDays: integer('credit_days').default(30),
  status: clientStatusEnum('status').default('pending'),
  notes: text('notes'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  emailCompanyIdx: uniqueIndex('clients_email_company_idx').on(t.email, t.companyId),
  codeCompanyIdx: uniqueIndex('clients_code_company_idx').on(t.code, t.companyId),
}));

// ─── Proveedores internacionales ─────────────────────────────────────────────
export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  country: text('country'),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Almacenes ───────────────────────────────────────────────────────────────
export const warehouses = pgTable('warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  location: text('location'),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Productos / mercancía ───────────────────────────────────────────────────
export const productCategories = pgTable('product_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  categoryId: uuid('category_id').references(() => productCategories.id),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  unit: text('unit').default('un'),
  costPrice: decimal('cost_price', { precision: 14, scale: 2 }),
  salePrice: decimal('sale_price', { precision: 14, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  skuCompanyIdx: uniqueIndex('products_sku_company_idx').on(t.sku, t.companyId),
}));

export const productMedia = pgTable('product_media', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  url: text('url').notNull(),
  altText: text('alt_text'),
  sortOrder: integer('sort_order').default(0),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Importaciones / contenedores ────────────────────────────────────────────
export const importShipments = pgTable('import_shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  reference: text('reference').notNull(),
  containerNumber: text('container_number'),
  status: importStatusEnum('status').default('in_transit'),
  etaDate: timestamp('eta_date'),
  receivedAt: timestamp('received_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const importItems = pgTable('import_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  shipmentId: uuid('shipment_id').references(() => importShipments.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: decimal('unit_cost', { precision: 14, scale: 2 }),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Inventario (total, reservado, despachado, disponible) ───────────────────
export const stockLevels = pgTable('stock_levels', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  totalQty: integer('total_qty').default(0).notNull(),
  reservedQty: integer('reserved_qty').default(0).notNull(),
  dispatchedQty: integer('dispatched_qty').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  productWarehouseIdx: uniqueIndex('stock_levels_product_warehouse_idx').on(t.productId, t.warehouseId),
}));

// ─── Catálogos y visual de mercancía ─────────────────────────────────────────
export const catalogs = pgTable('catalogs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  isPresale: boolean('is_presale').default(false),
  isPublic: boolean('is_public').default(false),
  coverImageUrl: text('cover_image_url'),
  validFrom: timestamp('valid_from'),
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  slugCompanyIdx: uniqueIndex('catalogs_slug_company_idx').on(t.slug, t.companyId),
}));

export const catalogProducts = pgTable('catalog_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  catalogId: uuid('catalog_id').references(() => catalogs.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  displayPrice: decimal('display_price', { precision: 14, scale: 2 }),
  sortOrder: integer('sort_order').default(0),
  notes: text('notes'),
});

// ─── Catálogo PDF (app móvil — sin precios en inventario) ────────────────────
export const catalogPdfs = pgTable('catalog_pdfs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  title: text('title').notNull(),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  version: integer('version').default(1).notNull(),
  isActive: boolean('is_active').default(true),
  uploadedById: uuid('uploaded_by_id').references(() => staffUsers.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Pedidos sin precio (cliente pide → admin adjudica) ──────────────────────
export const orderRequests = pgTable('order_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  reference: text('reference').notNull(),
  status: orderRequestStatusEnum('status').default('pending_pricing'),
  notes: text('notes'),
  totalAmount: decimal('total_amount', { precision: 14, scale: 2 }),
  pricedById: uuid('priced_by_id').references(() => staffUsers.id),
  pricedAt: timestamp('priced_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orderRequestItems = pgTable('order_request_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderRequestId: uuid('order_request_id').references(() => orderRequests.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 14, scale: 2 }),
  lineTotal: decimal('line_total', { precision: 14, scale: 2 }),
  notes: text('notes'),
});

// ─── Preventas ───────────────────────────────────────────────────────────────
export const presales = pgTable('presales', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  catalogId: uuid('catalog_id').references(() => catalogs.id),
  reference: text('reference').notNull(),
  status: presaleStatusEnum('status').default('open'),
  totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const presaleItems = pgTable('presale_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  presaleId: uuid('presale_id').references(() => presales.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 14, scale: 2 }).notNull(),
  lineTotal: decimal('line_total', { precision: 14, scale: 2 }).notNull(),
});

// ─── Cotizaciones ────────────────────────────────────────────────────────────
export const quotes = pgTable('quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  reference: text('reference').notNull(),
  status: quoteStatusEnum('status').default('draft'),
  totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).default('0'),
  validUntil: timestamp('valid_until'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const quoteItems = pgTable('quote_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: uuid('quote_id').references(() => quotes.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 14, scale: 2 }).notNull(),
  lineTotal: decimal('line_total', { precision: 14, scale: 2 }).notNull(),
});

// ─── Facturas ────────────────────────────────────────────────────────────────
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  reference: text('reference').notNull(),
  invoiceType: invoiceTypeEnum('invoice_type').default('cash').notNull(),
  status: invoiceStatusEnum('status').default('draft'),
  subtotal: decimal('subtotal', { precision: 14, scale: 2 }).default('0'),
  taxAmount: decimal('tax_amount', { precision: 14, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 14, scale: 2 }).default('0'),
  paidAmount: decimal('paid_amount', { precision: 14, scale: 2 }).default('0'),
  dueDate: timestamp('due_date'),
  issuedAt: timestamp('issued_at'),
  notes: text('notes'),
  presaleId: uuid('presale_id').references(() => presales.id),
  createdById: uuid('created_by_id').references(() => staffUsers.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  referenceCompanyIdx: uniqueIndex('invoices_reference_company_idx').on(t.reference, t.companyId),
}));

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 14, scale: 2 }).notNull(),
  lineTotal: decimal('line_total', { precision: 14, scale: 2 }).notNull(),
  dispatchedQty: integer('dispatched_qty').default(0).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
});

// ─── Pagos / abonos ──────────────────────────────────────────────────────────
export const invoicePayments = pgTable('invoice_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').references(() => invoices.id).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  method: paymentMethodEnum('method').default('transfer'),
  reference: text('reference'),
  paidAt: timestamp('paid_at').defaultNow(),
  notes: text('notes'),
  recordedById: uuid('recorded_by_id').references(() => staffUsers.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Despachos parciales ─────────────────────────────────────────────────────
export const dispatches = pgTable('dispatches', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  invoiceId: uuid('invoice_id').references(() => invoices.id),
  reference: text('reference').notNull(),
  status: dispatchStatusEnum('status').default('pending'),
  dispatchedAt: timestamp('dispatched_at'),
  notes: text('notes'),
  createdById: uuid('created_by_id').references(() => staffUsers.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const dispatchItems = pgTable('dispatch_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  dispatchId: uuid('dispatch_id').references(() => dispatches.id).notNull(),
  invoiceItemId: uuid('invoice_item_id').references(() => invoiceItems.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
});

// ─── Asignaciones cliente (mercancía facturada vs en almacén) ────────────────
export const clientAllocations = pgTable('client_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  invoiceItemId: uuid('invoice_item_id').references(() => invoiceItems.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  allocatedQty: integer('allocated_qty').notNull(),
  dispatchedQty: integer('dispatched_qty').default(0).notNull(),
  pendingQty: integer('pending_qty').notNull(),
  status: allocationStatusEnum('status').default('reserved'),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Listas de precios ───────────────────────────────────────────────────────
export const priceLists = pgTable('price_lists', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const priceListItems = pgTable('price_list_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  priceListId: uuid('price_list_id').references(() => priceLists.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  price: decimal('price', { precision: 14, scale: 2 }).notNull(),
}, (t) => ({
  priceListProductIdx: uniqueIndex('price_list_items_idx').on(t.priceListId, t.productId),
}));

export const clientPriceLists = pgTable('client_price_lists', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  priceListId: uuid('price_list_id').references(() => priceLists.id).notNull(),
});

// ─── Notificaciones y auditoría ──────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id),
  channel: text('channel').default('email'),
  subject: text('subject'),
  body: text('body'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  actorType: text('actor_type'),
  actorId: uuid('actor_id'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────
export const companiesRelations = relations(companies, ({ many }) => ({
  staff: many(staffUsers),
  clients: many(clients),
  products: many(products),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  company: one(companies, { fields: [clients.companyId], references: [companies.id] }),
  invoices: many(invoices),
  dispatches: many(dispatches),
  allocations: many(clientAllocations),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, { fields: [products.companyId], references: [companies.id] }),
  category: one(productCategories, { fields: [products.categoryId], references: [productCategories.id] }),
  media: many(productMedia),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  items: many(invoiceItems),
  payments: many(invoicePayments),
  dispatches: many(dispatches),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceItems.productId], references: [products.id] }),
}));
