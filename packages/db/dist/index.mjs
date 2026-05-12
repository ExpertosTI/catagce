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
} from "./chunk-22MBQYEE.mjs";

// src/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
var createClient = (connectionString) => {
  const client = postgres(connectionString);
  return drizzle(client, { schema: schema_exports });
};
export {
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
};
