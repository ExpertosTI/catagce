import { pgTable, serial, text, timestamp, integer, pgEnum, decimal, uuid, boolean } from 'drizzle-orm/pg-core';

// Enums
export const orderStatusEnum = pgEnum('order_status', [
  'draft_capture',
  'submitted',
  'reserved',
  'pending_seller_review',
  'confirmed',
  'partially_confirmed',
  'rejected',
  'cancelled',
  'expired'
]);

export const movementTypeEnum = pgEnum('movement_type', [
  'inbound',
  'outbound',
  'adjustment',
  'transfer_out',
  'transfer_in',
  'reservation_hold',
  'reservation_release',
  'order_confirmed',
  'count_reconcile'
]);

// Tenants
export const sellers = pgTable('sellers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sellerBranding = pgTable('seller_branding', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').default('#000000'),
  accentColor: text('accent_color').default('#ffffff'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Products
export const uoms = pgTable('uoms', {
  id: serial('id').primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  name: text('name').notNull(), // e.g., 'Unit', 'Dozen', 'Box'
  symbol: text('symbol'), // e.g., 'u', 'dz', 'bx'
  baseUomId: integer('base_uom_id'), // Self-reference for conversion
  conversionFactor: decimal('conversion_factor', { precision: 12, scale: 4 }).default('1.0000'),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  name: text('name').notNull(),
  sku: text('sku'),
  description: text('description'),
  baseUomId: integer('base_uom_id').references(() => uoms.id).notNull(),
  basePrice: decimal('base_price', { precision: 12, scale: 2 }).notNull(),
  b2bPrice: decimal('b2b_price', { precision: 12, scale: 2 }), // B2B Tiered pricing
  minOrderQuantity: decimal('min_order_quantity', { precision: 12, scale: 2 }).default('1'),
  isActive: boolean('is_active').default(true),
  imageUrl: text('image_url'),
  views: decimal('views', { precision: 12, scale: 0 }).default('0'), // Analytics
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const productMedia = pgTable('product_media', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  url: text('url').notNull(),
  isMain: boolean('is_main').default(false),
  sortOrder: integer('sort_order').default(0),
});

// Inventory
export const warehouses = pgTable('warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').default(false),
});

export const stockLevels = pgTable('stock_levels', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  onHandBase: decimal('on_hand_base', { precision: 12, scale: 4 }).default('0.0000'),
  reservedBase: decimal('reserved_base', { precision: 12, scale: 4 }).default('0.0000'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Ordering
export const catalogs = pgTable('catalogs', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // URL-friendly name
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const catalogProducts = pgTable('catalog_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  catalogId: uuid('catalog_id').references(() => catalogs.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').references(() => sellers.id).notNull(),
  status: orderStatusEnum('status').default('submitted'),
  buyerName: text('buyer_name').notNull(),
  buyerPhone: text('buyer_phone').notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});
