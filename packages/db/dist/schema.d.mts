import * as drizzle_orm from 'drizzle-orm';
import * as drizzle_orm_pg_core from 'drizzle-orm/pg-core';

declare const orderStatusEnum: drizzle_orm_pg_core.PgEnum<["draft_capture", "submitted", "reserved", "pending_seller_review", "confirmed", "partially_confirmed", "rejected", "cancelled", "expired"]>;
declare const movementTypeEnum: drizzle_orm_pg_core.PgEnum<["inbound", "outbound", "adjustment", "transfer_out", "transfer_in", "reservation_hold", "reservation_release", "order_confirmed", "count_reconcile"]>;
declare const reservationStatusEnum: drizzle_orm_pg_core.PgEnum<["active", "released", "consumed", "expired"]>;
declare const sellers: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "sellers";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "sellers";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        name: drizzle_orm_pg_core.PgColumn<{
            name: "name";
            tableName: "sellers";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        slug: drizzle_orm_pg_core.PgColumn<{
            name: "slug";
            tableName: "sellers";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        email: drizzle_orm_pg_core.PgColumn<{
            name: "email";
            tableName: "sellers";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        password: drizzle_orm_pg_core.PgColumn<{
            name: "password";
            tableName: "sellers";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        role: drizzle_orm_pg_core.PgColumn<{
            name: "role";
            tableName: "sellers";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: drizzle_orm_pg_core.PgColumn<{
            name: "status";
            tableName: "sellers";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: drizzle_orm_pg_core.PgColumn<{
            name: "created_at";
            tableName: "sellers";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: drizzle_orm_pg_core.PgColumn<{
            name: "updated_at";
            tableName: "sellers";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const sellerBranding: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "seller_branding";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sellerId: drizzle_orm_pg_core.PgColumn<{
            name: "seller_id";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        logoUrl: drizzle_orm_pg_core.PgColumn<{
            name: "logo_url";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        bannerUrl: drizzle_orm_pg_core.PgColumn<{
            name: "banner_url";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        primaryColor: drizzle_orm_pg_core.PgColumn<{
            name: "primary_color";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        accentColor: drizzle_orm_pg_core.PgColumn<{
            name: "accent_color";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        phone: drizzle_orm_pg_core.PgColumn<{
            name: "phone";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        whatsapp: drizzle_orm_pg_core.PgColumn<{
            name: "whatsapp";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        address: drizzle_orm_pg_core.PgColumn<{
            name: "address";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        instagram: drizzle_orm_pg_core.PgColumn<{
            name: "instagram";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        website: drizzle_orm_pg_core.PgColumn<{
            name: "website";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: drizzle_orm_pg_core.PgColumn<{
            name: "description";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        paymentMethods: drizzle_orm_pg_core.PgColumn<{
            name: "payment_methods";
            tableName: "seller_branding";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        updatedAt: drizzle_orm_pg_core.PgColumn<{
            name: "updated_at";
            tableName: "seller_branding";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const uoms: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "uoms";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "uoms";
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sellerId: drizzle_orm_pg_core.PgColumn<{
            name: "seller_id";
            tableName: "uoms";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        name: drizzle_orm_pg_core.PgColumn<{
            name: "name";
            tableName: "uoms";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        symbol: drizzle_orm_pg_core.PgColumn<{
            name: "symbol";
            tableName: "uoms";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        baseUomId: drizzle_orm_pg_core.PgColumn<{
            name: "base_uom_id";
            tableName: "uoms";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        conversionFactor: drizzle_orm_pg_core.PgColumn<{
            name: "conversion_factor";
            tableName: "uoms";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const products: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "products";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "products";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sellerId: drizzle_orm_pg_core.PgColumn<{
            name: "seller_id";
            tableName: "products";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        name: drizzle_orm_pg_core.PgColumn<{
            name: "name";
            tableName: "products";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        sku: drizzle_orm_pg_core.PgColumn<{
            name: "sku";
            tableName: "products";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: drizzle_orm_pg_core.PgColumn<{
            name: "description";
            tableName: "products";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        baseUomId: drizzle_orm_pg_core.PgColumn<{
            name: "base_uom_id";
            tableName: "products";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        basePrice: drizzle_orm_pg_core.PgColumn<{
            name: "base_price";
            tableName: "products";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        b2bPrice: drizzle_orm_pg_core.PgColumn<{
            name: "b2b_price";
            tableName: "products";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        minOrderQuantity: drizzle_orm_pg_core.PgColumn<{
            name: "min_order_quantity";
            tableName: "products";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isActive: drizzle_orm_pg_core.PgColumn<{
            name: "is_active";
            tableName: "products";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        imageUrl: drizzle_orm_pg_core.PgColumn<{
            name: "image_url";
            tableName: "products";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        views: drizzle_orm_pg_core.PgColumn<{
            name: "views";
            tableName: "products";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: drizzle_orm_pg_core.PgColumn<{
            name: "created_at";
            tableName: "products";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: drizzle_orm_pg_core.PgColumn<{
            name: "updated_at";
            tableName: "products";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const productMedia: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "product_media";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "product_media";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        productId: drizzle_orm_pg_core.PgColumn<{
            name: "product_id";
            tableName: "product_media";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        url: drizzle_orm_pg_core.PgColumn<{
            name: "url";
            tableName: "product_media";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        isMain: drizzle_orm_pg_core.PgColumn<{
            name: "is_main";
            tableName: "product_media";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sortOrder: drizzle_orm_pg_core.PgColumn<{
            name: "sort_order";
            tableName: "product_media";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const warehouses: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "warehouses";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "warehouses";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sellerId: drizzle_orm_pg_core.PgColumn<{
            name: "seller_id";
            tableName: "warehouses";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        name: drizzle_orm_pg_core.PgColumn<{
            name: "name";
            tableName: "warehouses";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        isDefault: drizzle_orm_pg_core.PgColumn<{
            name: "is_default";
            tableName: "warehouses";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const stockLevels: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "stock_levels";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "stock_levels";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sellerId: drizzle_orm_pg_core.PgColumn<{
            name: "seller_id";
            tableName: "stock_levels";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        warehouseId: drizzle_orm_pg_core.PgColumn<{
            name: "warehouse_id";
            tableName: "stock_levels";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        productId: drizzle_orm_pg_core.PgColumn<{
            name: "product_id";
            tableName: "stock_levels";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        onHandBase: drizzle_orm_pg_core.PgColumn<{
            name: "on_hand_base";
            tableName: "stock_levels";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reservedBase: drizzle_orm_pg_core.PgColumn<{
            name: "reserved_base";
            tableName: "stock_levels";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: drizzle_orm_pg_core.PgColumn<{
            name: "updated_at";
            tableName: "stock_levels";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const stockMovements: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "stock_movements";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "stock_movements";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sellerId: drizzle_orm_pg_core.PgColumn<{
            name: "seller_id";
            tableName: "stock_movements";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        warehouseId: drizzle_orm_pg_core.PgColumn<{
            name: "warehouse_id";
            tableName: "stock_movements";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        productId: drizzle_orm_pg_core.PgColumn<{
            name: "product_id";
            tableName: "stock_movements";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        movementType: drizzle_orm_pg_core.PgColumn<{
            name: "movement_type";
            tableName: "stock_movements";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "inbound" | "outbound" | "adjustment" | "transfer_out" | "transfer_in" | "reservation_hold" | "reservation_release" | "order_confirmed" | "count_reconcile";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["inbound", "outbound", "adjustment", "transfer_out", "transfer_in", "reservation_hold", "reservation_release", "order_confirmed", "count_reconcile"];
            baseColumn: never;
        }, {}, {}>;
        quantityBaseDelta: drizzle_orm_pg_core.PgColumn<{
            name: "quantity_base_delta";
            tableName: "stock_movements";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sourceUomId: drizzle_orm_pg_core.PgColumn<{
            name: "source_uom_id";
            tableName: "stock_movements";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sourceQuantity: drizzle_orm_pg_core.PgColumn<{
            name: "source_quantity";
            tableName: "stock_movements";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reasonCode: drizzle_orm_pg_core.PgColumn<{
            name: "reason_code";
            tableName: "stock_movements";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        referenceType: drizzle_orm_pg_core.PgColumn<{
            name: "reference_type";
            tableName: "stock_movements";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        referenceId: drizzle_orm_pg_core.PgColumn<{
            name: "reference_id";
            tableName: "stock_movements";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: drizzle_orm_pg_core.PgColumn<{
            name: "created_at";
            tableName: "stock_movements";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const stockReservations: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "stock_reservations";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "stock_reservations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sellerId: drizzle_orm_pg_core.PgColumn<{
            name: "seller_id";
            tableName: "stock_reservations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        orderId: drizzle_orm_pg_core.PgColumn<{
            name: "order_id";
            tableName: "stock_reservations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        warehouseId: drizzle_orm_pg_core.PgColumn<{
            name: "warehouse_id";
            tableName: "stock_reservations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        productId: drizzle_orm_pg_core.PgColumn<{
            name: "product_id";
            tableName: "stock_reservations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        reservedBase: drizzle_orm_pg_core.PgColumn<{
            name: "reserved_base";
            tableName: "stock_reservations";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        status: drizzle_orm_pg_core.PgColumn<{
            name: "status";
            tableName: "stock_reservations";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "expired" | "active" | "released" | "consumed";
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: ["active", "released", "consumed", "expired"];
            baseColumn: never;
        }, {}, {}>;
        expiresAt: drizzle_orm_pg_core.PgColumn<{
            name: "expires_at";
            tableName: "stock_reservations";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: drizzle_orm_pg_core.PgColumn<{
            name: "created_at";
            tableName: "stock_reservations";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const catalogs: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "catalogs";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "catalogs";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sellerId: drizzle_orm_pg_core.PgColumn<{
            name: "seller_id";
            tableName: "catalogs";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        name: drizzle_orm_pg_core.PgColumn<{
            name: "name";
            tableName: "catalogs";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        slug: drizzle_orm_pg_core.PgColumn<{
            name: "slug";
            tableName: "catalogs";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: drizzle_orm_pg_core.PgColumn<{
            name: "description";
            tableName: "catalogs";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        isActive: drizzle_orm_pg_core.PgColumn<{
            name: "is_active";
            tableName: "catalogs";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: drizzle_orm_pg_core.PgColumn<{
            name: "created_at";
            tableName: "catalogs";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const catalogProducts: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "catalog_products";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "catalog_products";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        catalogId: drizzle_orm_pg_core.PgColumn<{
            name: "catalog_id";
            tableName: "catalog_products";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        productId: drizzle_orm_pg_core.PgColumn<{
            name: "product_id";
            tableName: "catalog_products";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sortOrder: drizzle_orm_pg_core.PgColumn<{
            name: "sort_order";
            tableName: "catalog_products";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const orders: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "orders";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "orders";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sellerId: drizzle_orm_pg_core.PgColumn<{
            name: "seller_id";
            tableName: "orders";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        catalogId: drizzle_orm_pg_core.PgColumn<{
            name: "catalog_id";
            tableName: "orders";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        idempotencyKey: drizzle_orm_pg_core.PgColumn<{
            name: "idempotency_key";
            tableName: "orders";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: drizzle_orm_pg_core.PgColumn<{
            name: "status";
            tableName: "orders";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "draft_capture" | "submitted" | "reserved" | "pending_seller_review" | "confirmed" | "partially_confirmed" | "rejected" | "cancelled" | "expired";
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: ["draft_capture", "submitted", "reserved", "pending_seller_review", "confirmed", "partially_confirmed", "rejected", "cancelled", "expired"];
            baseColumn: never;
        }, {}, {}>;
        buyerName: drizzle_orm_pg_core.PgColumn<{
            name: "buyer_name";
            tableName: "orders";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        buyerPhone: drizzle_orm_pg_core.PgColumn<{
            name: "buyer_phone";
            tableName: "orders";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        totalAmount: drizzle_orm_pg_core.PgColumn<{
            name: "total_amount";
            tableName: "orders";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: drizzle_orm_pg_core.PgColumn<{
            name: "created_at";
            tableName: "orders";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const orderItems: drizzle_orm_pg_core.PgTableWithColumns<{
    name: "order_items";
    schema: undefined;
    columns: {
        id: drizzle_orm_pg_core.PgColumn<{
            name: "id";
            tableName: "order_items";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        orderId: drizzle_orm_pg_core.PgColumn<{
            name: "order_id";
            tableName: "order_items";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        productId: drizzle_orm_pg_core.PgColumn<{
            name: "product_id";
            tableName: "order_items";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        uomId: drizzle_orm_pg_core.PgColumn<{
            name: "uom_id";
            tableName: "order_items";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        quantity: drizzle_orm_pg_core.PgColumn<{
            name: "quantity";
            tableName: "order_items";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        unitPrice: drizzle_orm_pg_core.PgColumn<{
            name: "unit_price";
            tableName: "order_items";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        subtotal: drizzle_orm_pg_core.PgColumn<{
            name: "subtotal";
            tableName: "order_items";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
declare const sellersRelations: drizzle_orm.Relations<"sellers", {
    products: drizzle_orm.Many<"products">;
    warehouses: drizzle_orm.Many<"warehouses">;
    catalogs: drizzle_orm.Many<"catalogs">;
    orders: drizzle_orm.Many<"orders">;
    stockLevels: drizzle_orm.Many<"stock_levels">;
    stockMovements: drizzle_orm.Many<"stock_movements">;
    branding: drizzle_orm.One<"seller_branding", true>;
}>;
declare const sellerBrandingRelations: drizzle_orm.Relations<"seller_branding", {
    seller: drizzle_orm.One<"sellers", true>;
}>;
declare const uomsRelations: drizzle_orm.Relations<"uoms", {
    seller: drizzle_orm.One<"sellers", true>;
}>;
declare const productsRelations: drizzle_orm.Relations<"products", {
    seller: drizzle_orm.One<"sellers", true>;
    baseUom: drizzle_orm.One<"uoms", true>;
    stockLevels: drizzle_orm.Many<"stock_levels">;
    productMedia: drizzle_orm.Many<"product_media">;
    catalogProducts: drizzle_orm.Many<"catalog_products">;
    orderItems: drizzle_orm.Many<"order_items">;
}>;
declare const productMediaRelations: drizzle_orm.Relations<"product_media", {
    product: drizzle_orm.One<"products", true>;
}>;
declare const warehousesRelations: drizzle_orm.Relations<"warehouses", {
    seller: drizzle_orm.One<"sellers", true>;
    stockLevels: drizzle_orm.Many<"stock_levels">;
    stockMovements: drizzle_orm.Many<"stock_movements">;
    stockReservations: drizzle_orm.Many<"stock_reservations">;
}>;
declare const stockLevelsRelations: drizzle_orm.Relations<"stock_levels", {
    seller: drizzle_orm.One<"sellers", true>;
    warehouse: drizzle_orm.One<"warehouses", true>;
    product: drizzle_orm.One<"products", true>;
}>;
declare const stockMovementsRelations: drizzle_orm.Relations<"stock_movements", {
    seller: drizzle_orm.One<"sellers", true>;
    warehouse: drizzle_orm.One<"warehouses", true>;
    product: drizzle_orm.One<"products", true>;
}>;
declare const stockReservationsRelations: drizzle_orm.Relations<"stock_reservations", {
    seller: drizzle_orm.One<"sellers", true>;
    order: drizzle_orm.One<"orders", true>;
    warehouse: drizzle_orm.One<"warehouses", true>;
    product: drizzle_orm.One<"products", true>;
}>;
declare const catalogsRelations: drizzle_orm.Relations<"catalogs", {
    seller: drizzle_orm.One<"sellers", true>;
    catalogProducts: drizzle_orm.Many<"catalog_products">;
    orders: drizzle_orm.Many<"orders">;
}>;
declare const catalogProductsRelations: drizzle_orm.Relations<"catalog_products", {
    catalog: drizzle_orm.One<"catalogs", true>;
    product: drizzle_orm.One<"products", true>;
}>;
declare const ordersRelations: drizzle_orm.Relations<"orders", {
    seller: drizzle_orm.One<"sellers", true>;
    catalog: drizzle_orm.One<"catalogs", false>;
    orderItems: drizzle_orm.Many<"order_items">;
    stockReservations: drizzle_orm.Many<"stock_reservations">;
}>;
declare const orderItemsRelations: drizzle_orm.Relations<"order_items", {
    order: drizzle_orm.One<"orders", true>;
    product: drizzle_orm.One<"products", true>;
    uom: drizzle_orm.One<"uoms", false>;
}>;

export { catalogProducts, catalogProductsRelations, catalogs, catalogsRelations, movementTypeEnum, orderItems, orderItemsRelations, orderStatusEnum, orders, ordersRelations, productMedia, productMediaRelations, products, productsRelations, reservationStatusEnum, sellerBranding, sellerBrandingRelations, sellers, sellersRelations, stockLevels, stockLevelsRelations, stockMovements, stockMovementsRelations, stockReservations, stockReservationsRelations, uoms, uomsRelations, warehouses, warehousesRelations };
