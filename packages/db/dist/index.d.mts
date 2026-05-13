import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
export { catalogProducts, catalogProductsRelations, catalogs, catalogsRelations, movementTypeEnum, orderItems, orderItemsRelations, orderStatusEnum, orders, ordersRelations, productMedia, productMediaRelations, products, productsRelations, reservationStatusEnum, sellerBranding, sellerBrandingRelations, sellers, sellersRelations, stockLevels, stockLevelsRelations, stockMovements, stockMovementsRelations, stockReservations, stockReservationsRelations, uoms, uomsRelations, warehouses, warehousesRelations } from './schema.mjs';
import 'drizzle-orm';
import 'drizzle-orm/pg-core';

type CatagceDb = ReturnType<typeof drizzle<typeof schema>>;
interface CreateClientOptions {
    /** Max simultaneous connections from this client. */
    max?: number;
    /** Seconds to wait for a free connection before erroring. */
    connectTimeout?: number;
    /** Seconds an idle connection stays in pool. */
    idleTimeout?: number;
    /** When true, prepared statements are disabled (needed by pgBouncer in transaction mode). */
    disablePreparedStatements?: boolean;
}
declare function createPostgresClient(connectionString: string, opts?: CreateClientOptions): postgres.Sql<{}>;
declare function createClient(connectionString: string, opts?: CreateClientOptions): CatagceDb;

export { type CatagceDb, type CreateClientOptions, createClient, createPostgresClient };
