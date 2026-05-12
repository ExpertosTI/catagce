"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const db_1 = require("@catagce/db");
const drizzle_orm_1 = require("drizzle-orm");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let OrdersService = OrdersService_1 = class OrdersService {
    db;
    notificationsQueue;
    logger = new common_1.Logger(OrdersService_1.name);
    constructor(db, notificationsQueue) {
        this.db = db;
        this.notificationsQueue = notificationsQueue;
    }
    async findAll(sellerId) {
        return this.db.query.orders.findMany({
            where: (0, drizzle_orm_1.eq)(db_1.orders.sellerId, sellerId),
            with: { orderItems: { with: { product: true } } },
            orderBy: (o, { desc }) => [desc(o.createdAt)],
            limit: 500,
        });
    }
    async findOne(sellerId, id) {
        const order = await this.db.query.orders.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.orders.id, id), (0, drizzle_orm_1.eq)(db_1.orders.sellerId, sellerId)),
            with: { orderItems: { with: { product: true } } },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async submitPublicOrder(data) {
        const { catalogSlug, buyerName, buyerPhone, idempotencyKey, items } = data;
        const catalog = await this.db.query.catalogs.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.catalogs.slug, catalogSlug), (0, drizzle_orm_1.eq)(db_1.catalogs.isActive, true)),
        });
        if (!catalog)
            throw new common_1.NotFoundException('Catalog not found');
        const sellerId = catalog.sellerId;
        if (idempotencyKey) {
            const existing = await this.db.query.orders.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.orders.idempotencyKey, idempotencyKey), (0, drizzle_orm_1.eq)(db_1.orders.sellerId, sellerId)),
            });
            if (existing)
                return existing;
        }
        const orderedItems = await Promise.all(items.map(async (item) => {
            const product = await this.db.query.products.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.products.id, item.productId), (0, drizzle_orm_1.eq)(db_1.products.sellerId, sellerId), (0, drizzle_orm_1.eq)(db_1.products.isActive, true)),
            });
            if (!product) {
                throw new common_1.BadRequestException(`Producto ${item.productId} no disponible`);
            }
            const resolvedUnitPrice = parseFloat(product.b2bPrice ?? product.basePrice);
            if (!Number.isFinite(resolvedUnitPrice)) {
                throw new common_1.BadRequestException(`Precio inválido para producto ${item.productId}`);
            }
            return {
                productId: item.productId,
                quantity: item.quantity,
                uomId: item.uomId,
                resolvedUnitPrice,
            };
        }));
        const totalAmount = orderedItems
            .reduce((sum, item) => sum + item.quantity * item.resolvedUnitPrice, 0)
            .toFixed(2);
        const [order] = await this.db
            .insert(db_1.orders)
            .values({
            sellerId,
            catalogId: catalog.id,
            buyerName,
            buyerPhone,
            totalAmount,
            idempotencyKey: idempotencyKey ?? null,
            status: 'submitted',
        })
            .returning();
        await this.db.insert(db_1.orderItems).values(orderedItems.map((item) => ({
            orderId: order.id,
            productId: item.productId,
            uomId: item.uomId ?? null,
            quantity: item.quantity.toString(),
            unitPrice: item.resolvedUnitPrice.toFixed(2),
            subtotal: (item.quantity * item.resolvedUnitPrice).toFixed(2),
        })));
        // Reserva de inventario (no bloquea el pedido si falla, pero queda registrado)
        try {
            await this.reserveStock(order.id, sellerId, orderedItems);
        }
        catch (err) {
            this.logger.warn(`Reserva de stock falló para pedido ${order.id}: ${err.message}`);
        }
        const [seller] = await this.db
            .select()
            .from(db_1.sellers)
            .where((0, drizzle_orm_1.eq)(db_1.sellers.id, sellerId))
            .limit(1);
        await this.notificationsQueue.add('ORDER_CREATED', {
            type: 'ORDER_CREATED',
            data: {
                phone: buyerPhone,
                orderId: order.id,
                sellerName: seller?.name ?? 'Catagce',
                buyerName,
                totalAmount,
            },
        }, { attempts: 5, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: 100, removeOnFail: 500 });
        return order;
    }
    async updateStatus(id, sellerId, status) {
        const [existing] = await this.db
            .select()
            .from(db_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.orders.id, id), (0, drizzle_orm_1.eq)(db_1.orders.sellerId, sellerId)))
            .limit(1);
        if (!existing)
            throw new common_1.ForbiddenException('Order not found or access denied');
        const [updated] = await this.db
            .update(db_1.orders)
            .set({ status })
            .where((0, drizzle_orm_1.eq)(db_1.orders.id, id))
            .returning();
        if (status === 'confirmed') {
            try {
                await this.consumeReservations(id, sellerId);
            }
            catch (err) {
                this.logger.warn(`Consumo de stock falló (orden ${id}): ${err.message}`);
            }
            await this.notificationsQueue.add('ORDER_CONFIRMED', {
                type: 'ORDER_CONFIRMED',
                data: { orderId: id, sellerId },
            });
        }
        if (status === 'rejected' || status === 'cancelled' || status === 'expired') {
            try {
                await this.releaseReservations(id, sellerId);
            }
            catch (err) {
                this.logger.warn(`Liberación de stock falló (orden ${id}): ${err.message}`);
            }
            await this.notificationsQueue.add('ORDER_CANCELLED', {
                type: 'ORDER_CANCELLED',
                data: { orderId: id, sellerId },
            });
        }
        return updated;
    }
    // ─────────────────────────── Inventory ────────────────────────────
    async getDefaultWarehouse(sellerId) {
        const [w] = await this.db
            .select()
            .from(db_1.warehouses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.warehouses.sellerId, sellerId), (0, drizzle_orm_1.eq)(db_1.warehouses.isDefault, true)))
            .limit(1);
        if (w)
            return w.id;
        const [first] = await this.db
            .select()
            .from(db_1.warehouses)
            .where((0, drizzle_orm_1.eq)(db_1.warehouses.sellerId, sellerId))
            .limit(1);
        return first?.id ?? null;
    }
    async reserveStock(orderId, sellerId, items) {
        const warehouseId = await this.getDefaultWarehouse(sellerId);
        if (!warehouseId)
            return; // sin almacén → no se reserva, queda como info
        for (const item of items) {
            await this.db
                .insert(db_1.stockReservations)
                .values({
                sellerId,
                orderId,
                warehouseId,
                productId: item.productId,
                reservedBase: item.quantity.toString(),
                status: 'active',
            })
                .onConflictDoNothing();
            await this.db
                .update(db_1.stockLevels)
                .set({ reservedBase: (0, drizzle_orm_1.sql) `COALESCE(${db_1.stockLevels.reservedBase}, 0) + ${item.quantity}` })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.stockLevels.sellerId, sellerId), (0, drizzle_orm_1.eq)(db_1.stockLevels.warehouseId, warehouseId), (0, drizzle_orm_1.eq)(db_1.stockLevels.productId, item.productId)));
            await this.db.insert(db_1.stockMovements).values({
                sellerId,
                warehouseId,
                productId: item.productId,
                movementType: 'reservation_hold',
                quantityBaseDelta: item.quantity.toString(),
                referenceType: 'order',
                referenceId: orderId,
                reasonCode: 'order_submitted',
            });
        }
    }
    async releaseReservations(orderId, sellerId) {
        const reservations = await this.db
            .select()
            .from(db_1.stockReservations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.stockReservations.orderId, orderId), (0, drizzle_orm_1.eq)(db_1.stockReservations.status, 'active')));
        for (const r of reservations) {
            await this.db
                .update(db_1.stockReservations)
                .set({ status: 'released' })
                .where((0, drizzle_orm_1.eq)(db_1.stockReservations.id, r.id));
            await this.db
                .update(db_1.stockLevels)
                .set({ reservedBase: (0, drizzle_orm_1.sql) `GREATEST(COALESCE(${db_1.stockLevels.reservedBase}, 0) - ${r.reservedBase}, 0)` })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.stockLevels.sellerId, sellerId), (0, drizzle_orm_1.eq)(db_1.stockLevels.warehouseId, r.warehouseId), (0, drizzle_orm_1.eq)(db_1.stockLevels.productId, r.productId)));
            await this.db.insert(db_1.stockMovements).values({
                sellerId,
                warehouseId: r.warehouseId,
                productId: r.productId,
                movementType: 'reservation_release',
                quantityBaseDelta: r.reservedBase,
                referenceType: 'order',
                referenceId: orderId,
                reasonCode: 'order_cancelled',
            });
        }
    }
    async consumeReservations(orderId, sellerId) {
        const reservations = await this.db
            .select()
            .from(db_1.stockReservations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.stockReservations.orderId, orderId), (0, drizzle_orm_1.eq)(db_1.stockReservations.status, 'active')));
        for (const r of reservations) {
            await this.db
                .update(db_1.stockReservations)
                .set({ status: 'consumed' })
                .where((0, drizzle_orm_1.eq)(db_1.stockReservations.id, r.id));
            await this.db
                .update(db_1.stockLevels)
                .set({
                onHandBase: (0, drizzle_orm_1.sql) `GREATEST(COALESCE(${db_1.stockLevels.onHandBase}, 0) - ${r.reservedBase}, 0)`,
                reservedBase: (0, drizzle_orm_1.sql) `GREATEST(COALESCE(${db_1.stockLevels.reservedBase}, 0) - ${r.reservedBase}, 0)`,
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.stockLevels.sellerId, sellerId), (0, drizzle_orm_1.eq)(db_1.stockLevels.warehouseId, r.warehouseId), (0, drizzle_orm_1.eq)(db_1.stockLevels.productId, r.productId)));
            await this.db.insert(db_1.stockMovements).values({
                sellerId,
                warehouseId: r.warehouseId,
                productId: r.productId,
                movementType: 'order_confirmed',
                quantityBaseDelta: (0, drizzle_orm_1.sql) `-${r.reservedBase}`,
                referenceType: 'order',
                referenceId: orderId,
                reasonCode: 'order_confirmed',
            });
        }
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DRIZZLE)),
    __param(1, (0, bullmq_1.InjectQueue)('notifications')),
    __metadata("design:paramtypes", [Object, bullmq_2.Queue])
], OrdersService);
