"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  catalogProducts: () => catalogProducts,
  catalogProductsRelations: () => catalogProductsRelations,
  catalogs: () => catalogs,
  catalogsRelations: () => catalogsRelations,
  createClient: () => createClient,
  movementTypeEnum: () => movementTypeEnum,
  orderItems: () => orderItems,
  orderItemsRelations: () => orderItemsRelations,
  orderStatusEnum: () => orderStatusEnum,
  orders: () => orders,
  ordersRelations: () => ordersRelations,
  productMedia: () => productMedia,
  productMediaRelations: () => productMediaRelations,
  products: () => products,
  productsRelations: () => productsRelations,
  reservationStatusEnum: () => reservationStatusEnum,
  sellerBranding: () => sellerBranding,
  sellerBrandingRelations: () => sellerBrandingRelations,
  sellers: () => sellers,
  sellersRelations: () => sellersRelations,
  stockLevels: () => stockLevels,
  stockLevelsRelations: () => stockLevelsRelations,
  stockMovements: () => stockMovements,
  stockMovementsRelations: () => stockMovementsRelations,
  stockReservations: () => stockReservations,
  stockReservationsRelations: () => stockReservationsRelations,
  uoms: () => uoms,
  uomsRelations: () => uomsRelations,
  warehouses: () => warehouses,
  warehousesRelations: () => warehousesRelations
});
module.exports = __toCommonJS(index_exports);
var import_postgres_js = require("drizzle-orm/postgres-js");
var import_postgres = __toESM(require("postgres"));

// src/schema.ts
var schema_exports = {};
__export(schema_exports, {
  catalogProducts: () => catalogProducts,
  catalogProductsRelations: () => catalogProductsRelations,
  catalogs: () => catalogs,
  catalogsRelations: () => catalogsRelations,
  movementTypeEnum: () => movementTypeEnum,
  orderItems: () => orderItems,
  orderItemsRelations: () => orderItemsRelations,
  orderStatusEnum: () => orderStatusEnum,
  orders: () => orders,
  ordersRelations: () => ordersRelations,
  productMedia: () => productMedia,
  productMediaRelations: () => productMediaRelations,
  products: () => products,
  productsRelations: () => productsRelations,
  reservationStatusEnum: () => reservationStatusEnum,
  sellerBranding: () => sellerBranding,
  sellerBrandingRelations: () => sellerBrandingRelations,
  sellers: () => sellers,
  sellersRelations: () => sellersRelations,
  stockLevels: () => stockLevels,
  stockLevelsRelations: () => stockLevelsRelations,
  stockMovements: () => stockMovements,
  stockMovementsRelations: () => stockMovementsRelations,
  stockReservations: () => stockReservations,
  stockReservationsRelations: () => stockReservationsRelations,
  uoms: () => uoms,
  uomsRelations: () => uomsRelations,
  warehouses: () => warehouses,
  warehousesRelations: () => warehousesRelations
});
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_orm = require("drizzle-orm");
var orderStatusEnum = (0, import_pg_core.pgEnum)("order_status", [
  "draft_capture",
  "submitted",
  "reserved",
  "pending_seller_review",
  "confirmed",
  "partially_confirmed",
  "rejected",
  "cancelled",
  "expired"
]);
var movementTypeEnum = (0, import_pg_core.pgEnum)("movement_type", [
  "inbound",
  "outbound",
  "adjustment",
  "transfer_out",
  "transfer_in",
  "reservation_hold",
  "reservation_release",
  "order_confirmed",
  "count_reconcile"
]);
var reservationStatusEnum = (0, import_pg_core.pgEnum)("reservation_status", [
  "active",
  "released",
  "consumed",
  "expired"
]);
var sellers = (0, import_pg_core.pgTable)("sellers", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  name: (0, import_pg_core.text)("name").notNull(),
  slug: (0, import_pg_core.text)("slug").notNull().unique(),
  email: (0, import_pg_core.text)("email").unique(),
  password: (0, import_pg_core.text)("password"),
  // Store hashed password
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
});
var sellerBranding = (0, import_pg_core.pgTable)("seller_branding", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  sellerId: (0, import_pg_core.uuid)("seller_id").references(() => sellers.id).notNull(),
  logoUrl: (0, import_pg_core.text)("logo_url"),
  bannerUrl: (0, import_pg_core.text)("banner_url"),
  primaryColor: (0, import_pg_core.text)("primary_color").default("#00D1FF"),
  accentColor: (0, import_pg_core.text)("accent_color").default("#000000"),
  phone: (0, import_pg_core.text)("phone"),
  whatsapp: (0, import_pg_core.text)("whatsapp"),
  address: (0, import_pg_core.text)("address"),
  instagram: (0, import_pg_core.text)("instagram"),
  website: (0, import_pg_core.text)("website"),
  description: (0, import_pg_core.text)("description"),
  paymentMethods: (0, import_pg_core.text)("payment_methods"),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
}, (table) => ({
  uniqueSeller: (0, import_pg_core.uniqueIndex)("seller_branding_seller_unique").on(table.sellerId)
}));
var uoms = (0, import_pg_core.pgTable)("uoms", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  sellerId: (0, import_pg_core.uuid)("seller_id").references(() => sellers.id).notNull(),
  name: (0, import_pg_core.text)("name").notNull(),
  symbol: (0, import_pg_core.text)("symbol"),
  baseUomId: (0, import_pg_core.integer)("base_uom_id"),
  conversionFactor: (0, import_pg_core.decimal)("conversion_factor", { precision: 12, scale: 4 }).default("1.0000")
});
var products = (0, import_pg_core.pgTable)("products", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  sellerId: (0, import_pg_core.uuid)("seller_id").references(() => sellers.id).notNull(),
  name: (0, import_pg_core.text)("name").notNull(),
  sku: (0, import_pg_core.text)("sku"),
  description: (0, import_pg_core.text)("description"),
  baseUomId: (0, import_pg_core.integer)("base_uom_id").references(() => uoms.id).notNull(),
  basePrice: (0, import_pg_core.decimal)("base_price", { precision: 12, scale: 2 }).notNull(),
  b2bPrice: (0, import_pg_core.decimal)("b2b_price", { precision: 12, scale: 2 }),
  minOrderQuantity: (0, import_pg_core.decimal)("min_order_quantity", { precision: 12, scale: 4 }).default("1.0000"),
  isActive: (0, import_pg_core.boolean)("is_active").default(true),
  imageUrl: (0, import_pg_core.text)("image_url"),
  views: (0, import_pg_core.integer)("views").default(0),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
});
var productMedia = (0, import_pg_core.pgTable)("product_media", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  productId: (0, import_pg_core.uuid)("product_id").references(() => products.id).notNull(),
  url: (0, import_pg_core.text)("url").notNull(),
  isMain: (0, import_pg_core.boolean)("is_main").default(false),
  sortOrder: (0, import_pg_core.integer)("sort_order").default(0)
});
var warehouses = (0, import_pg_core.pgTable)("warehouses", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  sellerId: (0, import_pg_core.uuid)("seller_id").references(() => sellers.id).notNull(),
  name: (0, import_pg_core.text)("name").notNull(),
  isDefault: (0, import_pg_core.boolean)("is_default").default(false)
});
var stockLevels = (0, import_pg_core.pgTable)(
  "stock_levels",
  {
    id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
    sellerId: (0, import_pg_core.uuid)("seller_id").references(() => sellers.id).notNull(),
    warehouseId: (0, import_pg_core.uuid)("warehouse_id").references(() => warehouses.id).notNull(),
    productId: (0, import_pg_core.uuid)("product_id").references(() => products.id).notNull(),
    onHandBase: (0, import_pg_core.decimal)("on_hand_base", { precision: 12, scale: 4 }).default("0.0000"),
    reservedBase: (0, import_pg_core.decimal)("reserved_base", { precision: 12, scale: 4 }).default("0.0000"),
    updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
  },
  (table) => ({
    uniqueStock: (0, import_pg_core.uniqueIndex)("stock_levels_unique").on(
      table.sellerId,
      table.warehouseId,
      table.productId
    )
  })
);
var stockMovements = (0, import_pg_core.pgTable)("stock_movements", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  sellerId: (0, import_pg_core.uuid)("seller_id").references(() => sellers.id).notNull(),
  warehouseId: (0, import_pg_core.uuid)("warehouse_id").references(() => warehouses.id).notNull(),
  productId: (0, import_pg_core.uuid)("product_id").references(() => products.id).notNull(),
  movementType: movementTypeEnum("movement_type").notNull(),
  quantityBaseDelta: (0, import_pg_core.decimal)("quantity_base_delta", { precision: 12, scale: 4 }).notNull(),
  sourceUomId: (0, import_pg_core.integer)("source_uom_id").references(() => uoms.id),
  sourceQuantity: (0, import_pg_core.decimal)("source_quantity", { precision: 12, scale: 4 }),
  reasonCode: (0, import_pg_core.text)("reason_code"),
  referenceType: (0, import_pg_core.text)("reference_type"),
  referenceId: (0, import_pg_core.uuid)("reference_id"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
});
var stockReservations = (0, import_pg_core.pgTable)("stock_reservations", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  sellerId: (0, import_pg_core.uuid)("seller_id").references(() => sellers.id).notNull(),
  orderId: (0, import_pg_core.uuid)("order_id").references(() => orders.id).notNull(),
  warehouseId: (0, import_pg_core.uuid)("warehouse_id").references(() => warehouses.id).notNull(),
  productId: (0, import_pg_core.uuid)("product_id").references(() => products.id).notNull(),
  reservedBase: (0, import_pg_core.decimal)("reserved_base", { precision: 12, scale: 4 }).notNull(),
  status: reservationStatusEnum("status").default("active"),
  expiresAt: (0, import_pg_core.timestamp)("expires_at"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
});
var catalogs = (0, import_pg_core.pgTable)("catalogs", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  sellerId: (0, import_pg_core.uuid)("seller_id").references(() => sellers.id).notNull(),
  name: (0, import_pg_core.text)("name").notNull(),
  slug: (0, import_pg_core.text)("slug").notNull().unique(),
  description: (0, import_pg_core.text)("description"),
  isActive: (0, import_pg_core.boolean)("is_active").default(true),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
});
var catalogProducts = (0, import_pg_core.pgTable)("catalog_products", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  catalogId: (0, import_pg_core.uuid)("catalog_id").references(() => catalogs.id).notNull(),
  productId: (0, import_pg_core.uuid)("product_id").references(() => products.id).notNull(),
  sortOrder: (0, import_pg_core.integer)("sort_order").default(0)
});
var orders = (0, import_pg_core.pgTable)("orders", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  sellerId: (0, import_pg_core.uuid)("seller_id").references(() => sellers.id).notNull(),
  catalogId: (0, import_pg_core.uuid)("catalog_id").references(() => catalogs.id),
  idempotencyKey: (0, import_pg_core.text)("idempotency_key").unique(),
  status: orderStatusEnum("status").default("submitted"),
  buyerName: (0, import_pg_core.text)("buyer_name").notNull(),
  buyerPhone: (0, import_pg_core.text)("buyer_phone").notNull(),
  totalAmount: (0, import_pg_core.decimal)("total_amount", { precision: 12, scale: 2 }),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
});
var orderItems = (0, import_pg_core.pgTable)("order_items", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  orderId: (0, import_pg_core.uuid)("order_id").references(() => orders.id).notNull(),
  productId: (0, import_pg_core.uuid)("product_id").references(() => products.id).notNull(),
  uomId: (0, import_pg_core.integer)("uom_id").references(() => uoms.id),
  quantity: (0, import_pg_core.decimal)("quantity", { precision: 12, scale: 4 }).notNull(),
  unitPrice: (0, import_pg_core.decimal)("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: (0, import_pg_core.decimal)("subtotal", { precision: 12, scale: 2 }).notNull()
});
var sellersRelations = (0, import_drizzle_orm.relations)(sellers, ({ one, many }) => ({
  products: many(products),
  warehouses: many(warehouses),
  catalogs: many(catalogs),
  orders: many(orders),
  stockLevels: many(stockLevels),
  stockMovements: many(stockMovements),
  branding: one(sellerBranding, {
    fields: [sellers.id],
    references: [sellerBranding.sellerId]
  })
}));
var sellerBrandingRelations = (0, import_drizzle_orm.relations)(sellerBranding, ({ one }) => ({
  seller: one(sellers, {
    fields: [sellerBranding.sellerId],
    references: [sellers.id]
  })
}));
var uomsRelations = (0, import_drizzle_orm.relations)(uoms, ({ one }) => ({
  seller: one(sellers, { fields: [uoms.sellerId], references: [sellers.id] })
}));
var productsRelations = (0, import_drizzle_orm.relations)(products, ({ one, many }) => ({
  seller: one(sellers, { fields: [products.sellerId], references: [sellers.id] }),
  baseUom: one(uoms, { fields: [products.baseUomId], references: [uoms.id] }),
  stockLevels: many(stockLevels),
  productMedia: many(productMedia),
  catalogProducts: many(catalogProducts),
  orderItems: many(orderItems)
}));
var productMediaRelations = (0, import_drizzle_orm.relations)(productMedia, ({ one }) => ({
  product: one(products, { fields: [productMedia.productId], references: [products.id] })
}));
var warehousesRelations = (0, import_drizzle_orm.relations)(warehouses, ({ one, many }) => ({
  seller: one(sellers, { fields: [warehouses.sellerId], references: [sellers.id] }),
  stockLevels: many(stockLevels),
  stockMovements: many(stockMovements),
  stockReservations: many(stockReservations)
}));
var stockLevelsRelations = (0, import_drizzle_orm.relations)(stockLevels, ({ one }) => ({
  seller: one(sellers, { fields: [stockLevels.sellerId], references: [sellers.id] }),
  warehouse: one(warehouses, { fields: [stockLevels.warehouseId], references: [warehouses.id] }),
  product: one(products, { fields: [stockLevels.productId], references: [products.id] })
}));
var stockMovementsRelations = (0, import_drizzle_orm.relations)(stockMovements, ({ one }) => ({
  seller: one(sellers, { fields: [stockMovements.sellerId], references: [sellers.id] }),
  warehouse: one(warehouses, { fields: [stockMovements.warehouseId], references: [warehouses.id] }),
  product: one(products, { fields: [stockMovements.productId], references: [products.id] })
}));
var stockReservationsRelations = (0, import_drizzle_orm.relations)(stockReservations, ({ one }) => ({
  seller: one(sellers, { fields: [stockReservations.sellerId], references: [sellers.id] }),
  order: one(orders, { fields: [stockReservations.orderId], references: [orders.id] }),
  warehouse: one(warehouses, { fields: [stockReservations.warehouseId], references: [warehouses.id] }),
  product: one(products, { fields: [stockReservations.productId], references: [products.id] })
}));
var catalogsRelations = (0, import_drizzle_orm.relations)(catalogs, ({ one, many }) => ({
  seller: one(sellers, { fields: [catalogs.sellerId], references: [sellers.id] }),
  catalogProducts: many(catalogProducts),
  orders: many(orders)
}));
var catalogProductsRelations = (0, import_drizzle_orm.relations)(catalogProducts, ({ one }) => ({
  catalog: one(catalogs, { fields: [catalogProducts.catalogId], references: [catalogs.id] }),
  product: one(products, { fields: [catalogProducts.productId], references: [products.id] })
}));
var ordersRelations = (0, import_drizzle_orm.relations)(orders, ({ one, many }) => ({
  seller: one(sellers, { fields: [orders.sellerId], references: [sellers.id] }),
  catalog: one(catalogs, { fields: [orders.catalogId], references: [catalogs.id] }),
  orderItems: many(orderItems),
  stockReservations: many(stockReservations)
}));
var orderItemsRelations = (0, import_drizzle_orm.relations)(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  uom: one(uoms, { fields: [orderItems.uomId], references: [uoms.id] })
}));

// src/index.ts
var createClient = (connectionString) => {
  const client = (0, import_postgres.default)(connectionString);
  return (0, import_postgres_js.drizzle)(client, { schema: schema_exports });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  catalogProducts,
  catalogProductsRelations,
  catalogs,
  catalogsRelations,
  createClient,
  movementTypeEnum,
  orderItems,
  orderItemsRelations,
  orderStatusEnum,
  orders,
  ordersRelations,
  productMedia,
  productMediaRelations,
  products,
  productsRelations,
  reservationStatusEnum,
  sellerBranding,
  sellerBrandingRelations,
  sellers,
  sellersRelations,
  stockLevels,
  stockLevelsRelations,
  stockMovements,
  stockMovementsRelations,
  stockReservations,
  stockReservationsRelations,
  uoms,
  uomsRelations,
  warehouses,
  warehousesRelations
});
