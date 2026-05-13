import {
  catalogProducts,
  catalogProductsRelations,
  catalogs,
  catalogsRelations,
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
  schema_exports,
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
} from "./chunk-FJ2I6BLD.mjs";

// src/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
function createPostgresClient(connectionString, opts = {}) {
  return postgres(connectionString, {
    max: opts.max ?? 20,
    connect_timeout: opts.connectTimeout ?? 10,
    idle_timeout: opts.idleTimeout ?? 30,
    prepare: opts.disablePreparedStatements ? false : true,
    ssl: connectionString.includes("sslmode=require") ? "require" : void 0,
    onnotice: () => {
    }
  });
}
function createClient(connectionString, opts) {
  const client = createPostgresClient(connectionString, opts);
  return drizzle(client, { schema: schema_exports, logger: process.env.DB_LOG === "1" });
}
export {
  catalogProducts,
  catalogProductsRelations,
  catalogs,
  catalogsRelations,
  createClient,
  createPostgresClient,
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
};
