import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  pgEnum,
  decimal,
  uuid,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const orderStatusEnum = pgEnum('order_status', [
  'draft_capture',
  'submitted',
  'reserved',
  'pending_seller_review',
  'confirmed',
  'partially_confirmed',
  'rejected',
  'cancelled',
  'expired',
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
  'count_reconcile',
]);

export const reservationStatusEnum = pgEnum('reservation_status', [
  'active',
  'released',
  'consumed',
  'expired',
]);

// ---------------------------------------------------------------------------
// Tenant tables
// ---------------------------------------------------------------------------

export const sellers = pgTable('sellers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  email: text('email').unique(),
  password: text('password'), // Store hashed password
  role: text('role').default('seller'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sellerBranding = pgTable('seller_branding', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id')
    .references(() => sellers.id)
    .notNull(),
  logoUrl: text('logo_url'),
  bannerUrl: text('banner_url'),
  primaryColor: text('primary_color').default('#00D1FF'),
  accentColor: text('accent_color').default('#000000'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  address: text('address'),
  instagram: text('instagram'),
  website: text('website'),
  description: text('description'),
  paymentMethods: text('payment_methods'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueSeller: uniqueIndex('seller_branding_seller_unique').on(table.sellerId),
}));

// ---------------------------------------------------------------------------
// UOM and product tables
// ---------------------------------------------------------------------------

export const uoms = pgTable('uoms', {
  id: serial('id').primaryKey(),
  sellerId: uuid('seller_id')
    .references(() => sellers.id)
    .notNull(),
  name: text('name').notNull(),
  symbol: text('symbol'),
  baseUomId: integer('base_uom_id'),
  conversionFactor: decimal('conversion_factor', { precision: 12, scale: 4 }).default('1.0000'),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id')
    .references(() => sellers.id)
    .notNull(),
  name: text('name').notNull(),
  sku: text('sku'),
  description: text('description'),
  baseUomId: integer('base_uom_id')
    .references(() => uoms.id)
    .notNull(),
  basePrice: decimal('base_price', { precision: 12, scale: 2 }).notNull(),
  b2bPrice: decimal('b2b_price', { precision: 12, scale: 2 }),
  minOrderQuantity: decimal('min_order_quantity', { precision: 12, scale: 4 }).default('1.0000'),
  isActive: boolean('is_active').default(true),
  imageUrl: text('image_url'),
  views: integer('views').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const productMedia = pgTable('product_media', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .references(() => products.id)
    .notNull(),
  url: text('url').notNull(),
  isMain: boolean('is_main').default(false),
  sortOrder: integer('sort_order').default(0),
});

// ---------------------------------------------------------------------------
// Warehouse and stock tables
// ---------------------------------------------------------------------------

export const warehouses = pgTable('warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id')
    .references(() => sellers.id)
    .notNull(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').default(false),
});

export const stockLevels = pgTable(
  'stock_levels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sellerId: uuid('seller_id')
      .references(() => sellers.id)
      .notNull(),
    warehouseId: uuid('warehouse_id')
      .references(() => warehouses.id)
      .notNull(),
    productId: uuid('product_id')
      .references(() => products.id)
      .notNull(),
    onHandBase: decimal('on_hand_base', { precision: 12, scale: 4 }).default('0.0000'),
    reservedBase: decimal('reserved_base', { precision: 12, scale: 4 }).default('0.0000'),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    uniqueStock: uniqueIndex('stock_levels_unique').on(
      table.sellerId,
      table.warehouseId,
      table.productId,
    ),
  }),
);

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id')
    .references(() => sellers.id)
    .notNull(),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id)
    .notNull(),
  productId: uuid('product_id')
    .references(() => products.id)
    .notNull(),
  movementType: movementTypeEnum('movement_type').notNull(),
  quantityBaseDelta: decimal('quantity_base_delta', { precision: 12, scale: 4 }).notNull(),
  sourceUomId: integer('source_uom_id').references(() => uoms.id),
  sourceQuantity: decimal('source_quantity', { precision: 12, scale: 4 }),
  reasonCode: text('reason_code'),
  referenceType: text('reference_type'),
  referenceId: uuid('reference_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockReservations = pgTable('stock_reservations', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id')
    .references(() => sellers.id)
    .notNull(),
  orderId: uuid('order_id')
    .references(() => orders.id)
    .notNull(),
  warehouseId: uuid('warehouse_id')
    .references(() => warehouses.id)
    .notNull(),
  productId: uuid('product_id')
    .references(() => products.id)
    .notNull(),
  reservedBase: decimal('reserved_base', { precision: 12, scale: 4 }).notNull(),
  status: reservationStatusEnum('status').default('active'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ---------------------------------------------------------------------------
// Catalog tables
// ---------------------------------------------------------------------------

export const catalogs = pgTable('catalogs', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id')
    .references(() => sellers.id)
    .notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const catalogProducts = pgTable('catalog_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  catalogId: uuid('catalog_id')
    .references(() => catalogs.id)
    .notNull(),
  productId: uuid('product_id')
    .references(() => products.id)
    .notNull(),
  sortOrder: integer('sort_order').default(0),
});

// ---------------------------------------------------------------------------
// Order tables
// ---------------------------------------------------------------------------

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id')
    .references(() => sellers.id)
    .notNull(),
  catalogId: uuid('catalog_id').references(() => catalogs.id),
  idempotencyKey: text('idempotency_key').unique(),
  status: orderStatusEnum('status').default('submitted'),
  buyerName: text('buyer_name').notNull(),
  buyerPhone: text('buyer_phone').notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .references(() => orders.id)
    .notNull(),
  productId: uuid('product_id')
    .references(() => products.id)
    .notNull(),
  uomId: integer('uom_id').references(() => uoms.id),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const sellersRelations = relations(sellers, ({ one, many }) => ({
  products: many(products),
  warehouses: many(warehouses),
  catalogs: many(catalogs),
  orders: many(orders),
  stockLevels: many(stockLevels),
  stockMovements: many(stockMovements),
  branding: one(sellerBranding, {
    fields: [sellers.id],
    references: [sellerBranding.sellerId],
  }),
}));

export const sellerBrandingRelations = relations(sellerBranding, ({ one }) => ({
  seller: one(sellers, {
    fields: [sellerBranding.sellerId],
    references: [sellers.id],
  }),
}));

export const uomsRelations = relations(uoms, ({ one }) => ({
  seller: one(sellers, { fields: [uoms.sellerId], references: [sellers.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(sellers, { fields: [products.sellerId], references: [sellers.id] }),
  baseUom: one(uoms, { fields: [products.baseUomId], references: [uoms.id] }),
  stockLevels: many(stockLevels),
  productMedia: many(productMedia),
  catalogProducts: many(catalogProducts),
  orderItems: many(orderItems),
}));

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, { fields: [productMedia.productId], references: [products.id] }),
}));

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  seller: one(sellers, { fields: [warehouses.sellerId], references: [sellers.id] }),
  stockLevels: many(stockLevels),
  stockMovements: many(stockMovements),
  stockReservations: many(stockReservations),
}));

export const stockLevelsRelations = relations(stockLevels, ({ one }) => ({
  seller: one(sellers, { fields: [stockLevels.sellerId], references: [sellers.id] }),
  warehouse: one(warehouses, { fields: [stockLevels.warehouseId], references: [warehouses.id] }),
  product: one(products, { fields: [stockLevels.productId], references: [products.id] }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  seller: one(sellers, { fields: [stockMovements.sellerId], references: [sellers.id] }),
  warehouse: one(warehouses, { fields: [stockMovements.warehouseId], references: [warehouses.id] }),
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
}));

export const stockReservationsRelations = relations(stockReservations, ({ one }) => ({
  seller: one(sellers, { fields: [stockReservations.sellerId], references: [sellers.id] }),
  order: one(orders, { fields: [stockReservations.orderId], references: [orders.id] }),
  warehouse: one(warehouses, { fields: [stockReservations.warehouseId], references: [warehouses.id] }),
  product: one(products, { fields: [stockReservations.productId], references: [products.id] }),
}));

export const catalogsRelations = relations(catalogs, ({ one, many }) => ({
  seller: one(sellers, { fields: [catalogs.sellerId], references: [sellers.id] }),
  catalogProducts: many(catalogProducts),
  orders: many(orders),
}));

export const catalogProductsRelations = relations(catalogProducts, ({ one }) => ({
  catalog: one(catalogs, { fields: [catalogProducts.catalogId], references: [catalogs.id] }),
  product: one(products, { fields: [catalogProducts.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  seller: one(sellers, { fields: [orders.sellerId], references: [sellers.id] }),
  catalog: one(catalogs, { fields: [orders.catalogId], references: [catalogs.id] }),
  orderItems: many(orderItems),
  stockReservations: many(stockReservations),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  uom: one(uoms, { fields: [orderItems.uomId], references: [uoms.id] }),
}));
