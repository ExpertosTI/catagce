import {
  pgTable, serial, text, timestamp, integer, pgEnum, decimal, uuid, boolean, jsonb, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────
export const orderStatusEnum = pgEnum('order_status', [
  'draft_capture', 'submitted', 'reserved', 'pending_seller_review',
  'confirmed', 'partially_confirmed', 'rejected', 'cancelled', 'expired',
]);

export const movementTypeEnum = pgEnum('movement_type', [
  'inbound', 'outbound', 'adjustment', 'transfer_out', 'transfer_in',
  'reservation_hold', 'reservation_release', 'order_confirmed', 'count_reconcile',
]);

export const integrationTypeEnum = pgEnum('integration_type', [
  'odoo', 'shopify', 'woocommerce', 'custom',
]);

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'operator', 'viewer']);

export const reservationStatusEnum = pgEnum('reservation_status', [
  'active', 'released', 'consumed', 'expired',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'whatsapp', 'email', 'push', 'webhook',
]);

export const jobStatusEnum = pgEnum('job_status', [
  'pending', 'running', 'completed', 'failed',
]);

export const whatsappTicketStatusEnum = pgEnum('whatsapp_ticket_status', [
  'open', 'pending', 'resolved', 'closed',
]);

// ─── Tenants & Identity ──────────────────────────────────────────────────────
export const sellers = pgTable('sellers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  email: text('email'),
  phone: text('phone'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sellerUsers = pgTable('seller_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').default('owner'),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  emailSellerIdx: uniqueIndex('seller_users_email_seller_idx').on(t.email, t.sellerId),
}));

export const sellerApiKeys = pgTable('seller_api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  key: text('key').notNull().unique(),
  name: text('name').notNull().default('Default'),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sellerBranding = pgTable('seller_branding', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull().unique(),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').default('#00D1FF'),
  accentColor: text('accent_color').default('#FF8A00'),
  customDomain: text('custom_domain'),
  welcomeMessage: text('welcome_message'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sellerSettings = pgTable('seller_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull().unique(),
  currency: text('currency').default('USD'),
  timezone: text('timezone').default('America/Santo_Domingo'),
  lowStockThreshold: decimal('low_stock_threshold', { precision: 12, scale: 4 }).default('10'),
  whatsappNumber: text('whatsapp_number'),
  autoConfirmOrders: boolean('auto_confirm_orders').default(false),
  reservationTtlMinutes: integer('reservation_ttl_minutes').default(60),
  googleAiApiKey: text('google_ai_api_key'),
  aiModel: text('ai_model').default('gemini-2.5-flash'),
  aiEnabled: boolean('ai_enabled').default(true),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  onboardingStep: integer('onboarding_step').default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Products & Media ────────────────────────────────────────────────────────
export const uoms = pgTable('uoms', {
  id: serial('id').primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  name: text('name').notNull(),
  symbol: text('symbol'),
  baseUomId: integer('base_uom_id'),
  conversionFactor: decimal('conversion_factor', { precision: 12, scale: 4 }).default('1.0000'),
  isSellable: boolean('is_sellable').default(true),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  name: text('name').notNull(),
  sku: text('sku'),
  description: text('description'),
  category: text('category'),
  baseUomId: integer('base_uom_id').references(() => uoms.id).notNull(),
  basePrice: decimal('base_price', { precision: 12, scale: 2 }).notNull(),
  b2bPrice: decimal('b2b_price', { precision: 12, scale: 2 }),
  minOrderQuantity: decimal('min_order_quantity', { precision: 12, scale: 2 }).default('1'),
  isActive: boolean('is_active').default(true),
  imageUrl: text('image_url'),
  externalId: text('external_id'),
  externalSource: text('external_source'),
  views: integer('views').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  name: text('name').notNull(),
  sku: text('sku'),
  priceAdjustment: decimal('price_adjustment', { precision: 12, scale: 2 }).default('0'),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
});

export const productBarcodes = pgTable('product_barcodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  barcode: text('barcode').notNull(),
  type: text('type').default('ean13'),
});

export const productMedia = pgTable('product_media', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  url: text('url').notNull(),
  isMain: boolean('is_main').default(false),
  sortOrder: integer('sort_order').default(0),
});

export const priceLists = pgTable('price_lists', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const priceListItems = pgTable('price_list_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  priceListId: uuid('price_list_id').references(() => priceLists.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  minQuantity: decimal('min_quantity', { precision: 12, scale: 4 }).default('1'),
});

// ─── Inventory ───────────────────────────────────────────────────────────────
export const warehouses = pgTable('warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  isDefault: boolean('is_default').default(false),
});

export const stockLevels = pgTable('stock_levels', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  onHandBase: decimal('on_hand_base', { precision: 12, scale: 4 }).default('0.0000'),
  reservedBase: decimal('reserved_base', { precision: 12, scale: 4 }).default('0.0000'),
  minimumThresholdBase: decimal('minimum_threshold_base', { precision: 12, scale: 4 }).default('0'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  movementType: movementTypeEnum('movement_type').notNull(),
  quantityBaseDelta: decimal('quantity_base_delta', { precision: 12, scale: 4 }).notNull(),
  sourceUomId: integer('source_uom_id').references(() => uoms.id),
  sourceQuantity: decimal('source_quantity', { precision: 12, scale: 4 }),
  reasonCode: text('reason_code'),
  actorUserId: uuid('actor_user_id'),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Catalogs ────────────────────────────────────────────────────────────────
export const catalogTemplates = pgTable('catalog_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id),
  name: text('name').notNull(),
  layout: text('layout').default('grid'),
  isSystem: boolean('is_system').default(false),
});

export const catalogs = pgTable('catalogs', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  templateId: uuid('template_id').references(() => catalogTemplates.id),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const catalogProducts = pgTable('catalog_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  catalogId: uuid('catalog_id').references(() => catalogs.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  sortOrder: integer('sort_order').default(0),
  priceOverride: decimal('price_override', { precision: 12, scale: 2 }),
});

export const catalogPublications = pgTable('catalog_publications', {
  id: uuid('id').defaultRandom().primaryKey(),
  catalogId: uuid('catalog_id').references(() => catalogs.id).notNull(),
  token: text('token').notNull().unique(),
  brandingSnapshot: jsonb('branding_snapshot'),
  productSnapshot: jsonb('product_snapshot'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const catalogPublicationAssets = pgTable('catalog_publication_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicationId: uuid('publication_id').references(() => catalogPublications.id).notNull(),
  assetType: text('asset_type').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Orders ──────────────────────────────────────────────────────────────────
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  catalogId: uuid('catalog_id').references(() => catalogs.id),
  publicationToken: text('publication_token'),
  idempotencyKey: text('idempotency_key'),
  status: orderStatusEnum('status').default('submitted'),
  buyerName: text('buyer_name').notNull(),
  buyerPhone: text('buyer_phone').notNull(),
  buyerEmail: text('buyer_email'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  uomId: integer('uom_id').references(() => uoms.id),
});

export const orderItemAllocations = pgTable('order_item_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderItemId: uuid('order_item_id').references(() => orderItems.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  reservedBase: decimal('reserved_base', { precision: 12, scale: 4 }).notNull(),
  confirmedBase: decimal('confirmed_base', { precision: 12, scale: 4 }).default('0'),
  releasedBase: decimal('released_base', { precision: 12, scale: 4 }).default('0'),
  status: text('status').default('pending'),
});

export const orderEvents = pgTable('order_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  eventType: text('event_type').notNull(),
  actorUserId: uuid('actor_user_id'),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const buyerContacts = pgTable('buyer_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  orderCount: integer('order_count').default(0),
  totalSpent: decimal('total_spent', { precision: 12, scale: 2 }).default('0'),
  lastOrderAt: timestamp('last_order_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockReservations = pgTable('stock_reservations', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  orderId: uuid('order_id').references(() => orders.id),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id),
  reservedBase: decimal('reserved_base', { precision: 12, scale: 4 }).notNull(),
  status: reservationStatusEnum('status').default('active'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Webhooks & Integrations ─────────────────────────────────────────────────
export const webhooks = pgTable('webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  url: text('url').notNull(),
  secret: text('secret'),
  events: text('events').array().notNull().default(sql`'{}'::text[]`),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  webhookId: uuid('webhook_id').references(() => webhooks.id).notNull(),
  event: text('event').notNull(),
  payload: jsonb('payload'),
  statusCode: integer('status_code'),
  success: boolean('success').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const integrations = pgTable('integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  type: integrationTypeEnum('type').notNull(),
  name: text('name').notNull(),
  config: jsonb('config').notNull().default({}),
  isActive: boolean('is_active').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  lastSyncStatus: text('last_sync_status'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const integrationLogs = pgTable('integration_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  integrationId: uuid('integration_id').references(() => integrations.id).notNull(),
  level: text('level').default('info'),
  message: text('message').notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Cross-cutting ───────────────────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  actorUserId: uuid('actor_user_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  changes: jsonb('changes'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  recipient: text('recipient').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  status: text('status').default('pending'),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const idempotencyKeys = pgTable('idempotency_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  key: text('key').notNull(),
  response: jsonb('response'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  sellerKeyIdx: uniqueIndex('idempotency_seller_key_idx').on(t.sellerId, t.key),
}));

export const jobRuns = pgTable('job_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id),
  jobType: text('job_type').notNull(),
  status: jobStatusEnum('status').default('pending'),
  input: jsonb('input'),
  output: jsonb('output'),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const aiChatSessions = pgTable('ai_chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  userId: uuid('user_id'),
  title: text('title').default('Nueva conversación'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const aiChatMessages = pgTable('ai_chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => aiChatSessions.id).notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const verificationCodes = pgTable('verification_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: text('phone').notNull(),
  codeHash: text('code_hash').notNull(),
  purpose: text('purpose').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── WhatsApp Inbox (Whaticket-style) ───────────────────────────────────────
export const whatsappLabels = pgTable('whatsapp_labels', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  name: text('name').notNull(),
  color: text('color').default('#00D1FF'),
  evolutionLabelId: text('evolution_label_id'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  sellerNameIdx: uniqueIndex('whatsapp_labels_seller_name_idx').on(t.sellerId, t.name),
}));

export const whatsappTickets = pgTable('whatsapp_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  remoteJid: text('remote_jid').notNull(),
  phone: text('phone').notNull(),
  contactName: text('contact_name'),
  status: whatsappTicketStatusEnum('status').default('open'),
  labelIds: text('label_ids').array().default(sql`'{}'::text[]`),
  lastMessageAt: timestamp('last_message_at'),
  lastMessagePreview: text('last_message_preview'),
  unreadCount: integer('unread_count').default(0),
  assignedUserId: uuid('assigned_user_id').references(() => sellerUsers.id),
  isGroup: boolean('is_group').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  sellerJidIdx: uniqueIndex('whatsapp_tickets_seller_jid_idx').on(t.sellerId, t.remoteJid),
}));

export const whatsappQuickReplies = pgTable('whatsapp_quick_replies', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  shortcut: text('shortcut'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────────────────────
export const sellersRelations = relations(sellers, ({ one, many }) => ({
  branding: one(sellerBranding, { fields: [sellers.id], references: [sellerBranding.sellerId] }),
  settings: one(sellerSettings, { fields: [sellers.id], references: [sellerSettings.sellerId] }),
  users: many(sellerUsers),
  apiKeys: many(sellerApiKeys),
  products: many(products),
  catalogs: many(catalogs),
  orders: many(orders),
  webhooks: many(webhooks),
  integrations: many(integrations),
  warehouses: many(warehouses),
  priceLists: many(priceLists),
  buyerContacts: many(buyerContacts),
  whatsappLabels: many(whatsappLabels),
  whatsappTickets: many(whatsappTickets),
  whatsappQuickReplies: many(whatsappQuickReplies),
}));

export const sellerUsersRelations = relations(sellerUsers, ({ one }) => ({
  seller: one(sellers, { fields: [sellerUsers.sellerId], references: [sellers.id] }),
}));

export const sellerApiKeysRelations = relations(sellerApiKeys, ({ one }) => ({
  seller: one(sellers, { fields: [sellerApiKeys.sellerId], references: [sellers.id] }),
}));

export const sellerBrandingRelations = relations(sellerBranding, ({ one }) => ({
  seller: one(sellers, { fields: [sellerBranding.sellerId], references: [sellers.id] }),
}));

export const sellerSettingsRelations = relations(sellerSettings, ({ one }) => ({
  seller: one(sellers, { fields: [sellerSettings.sellerId], references: [sellers.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(sellers, { fields: [products.sellerId], references: [sellers.id] }),
  baseUom: one(uoms, { fields: [products.baseUomId], references: [uoms.id] }),
  variants: many(productVariants),
  barcodes: many(productBarcodes),
  media: many(productMedia),
  stockLevels: many(stockLevels),
  catalogProducts: many(catalogProducts),
  orderItems: many(orderItems),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));

export const productBarcodesRelations = relations(productBarcodes, ({ one }) => ({
  product: one(products, { fields: [productBarcodes.productId], references: [products.id] }),
}));

export const stockLevelsRelations = relations(stockLevels, ({ one }) => ({
  product: one(products, { fields: [stockLevels.productId], references: [products.id] }),
  warehouse: one(warehouses, { fields: [stockLevels.warehouseId], references: [warehouses.id] }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  warehouse: one(warehouses, { fields: [stockMovements.warehouseId], references: [warehouses.id] }),
}));

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  seller: one(sellers, { fields: [warehouses.sellerId], references: [sellers.id] }),
  stockLevels: many(stockLevels),
}));

export const catalogsRelations = relations(catalogs, ({ one, many }) => ({
  seller: one(sellers, { fields: [catalogs.sellerId], references: [sellers.id] }),
  template: one(catalogTemplates, { fields: [catalogs.templateId], references: [catalogTemplates.id] }),
  catalogProducts: many(catalogProducts),
  publications: many(catalogPublications),
}));

export const catalogProductsRelations = relations(catalogProducts, ({ one }) => ({
  catalog: one(catalogs, { fields: [catalogProducts.catalogId], references: [catalogs.id] }),
  product: one(products, { fields: [catalogProducts.productId], references: [products.id] }),
}));

export const catalogPublicationsRelations = relations(catalogPublications, ({ one, many }) => ({
  catalog: one(catalogs, { fields: [catalogPublications.catalogId], references: [catalogs.id] }),
  assets: many(catalogPublicationAssets),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  seller: one(sellers, { fields: [orders.sellerId], references: [sellers.id] }),
  catalog: one(catalogs, { fields: [orders.catalogId], references: [catalogs.id] }),
  items: many(orderItems),
  events: many(orderEvents),
  reservations: many(stockReservations),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  allocations: many(orderItemAllocations),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  seller: one(sellers, { fields: [webhooks.sellerId], references: [sellers.id] }),
  deliveries: many(webhookDeliveries),
}));

export const integrationsRelations = relations(integrations, ({ one, many }) => ({
  seller: one(sellers, { fields: [integrations.sellerId], references: [sellers.id] }),
  logs: many(integrationLogs),
}));

export const priceListsRelations = relations(priceLists, ({ one, many }) => ({
  seller: one(sellers, { fields: [priceLists.sellerId], references: [sellers.id] }),
  items: many(priceListItems),
}));

export const buyerContactsRelations = relations(buyerContacts, ({ one }) => ({
  seller: one(sellers, { fields: [buyerContacts.sellerId], references: [sellers.id] }),
}));

export const whatsappLabelsRelations = relations(whatsappLabels, ({ one }) => ({
  seller: one(sellers, { fields: [whatsappLabels.sellerId], references: [sellers.id] }),
}));

export const whatsappTicketsRelations = relations(whatsappTickets, ({ one }) => ({
  seller: one(sellers, { fields: [whatsappTickets.sellerId], references: [sellers.id] }),
  assignedUser: one(sellerUsers, { fields: [whatsappTickets.assignedUserId], references: [sellerUsers.id] }),
}));

export const whatsappQuickRepliesRelations = relations(whatsappQuickReplies, ({ one }) => ({
  seller: one(sellers, { fields: [whatsappQuickReplies.sellerId], references: [sellers.id] }),
}));
