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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const db_1 = require("@catagce/db");
const drizzle_orm_1 = require("drizzle-orm");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let OrdersService = class OrdersService {
    db;
    notificationsQueue;
    constructor(db, notificationsQueue) {
        this.db = db;
        this.notificationsQueue = notificationsQueue;
    }
    async findAll(sellerId) {
        return this.db.query.orders.findMany({
            where: (0, drizzle_orm_1.eq)(db_1.orders.sellerId, sellerId),
            with: { orderItems: { with: { product: true } } },
        });
    }
    /**
     * Zero-login public order submission from buyer.
     * Resolves seller context via catalogSlug — never from a client-provided sellerId.
     */
    async submitPublicOrder(data) {
        const { catalogSlug, buyerName, buyerPhone, idempotencyKey, items } = data;
        if (!buyerName || !buyerPhone || !catalogSlug || !items?.length) {
            throw new common_1.BadRequestException('catalogSlug, buyerName, buyerPhone and items are required');
        }
        // Resolve seller from catalog slug — client never provides sellerId directly
        const catalog = await this.db.query.catalogs.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.catalogs.slug, catalogSlug), (0, drizzle_orm_1.eq)(db_1.catalogs.isActive, true)),
        });
        if (!catalog)
            throw new common_1.NotFoundException('Catalog not found');
        const sellerId = catalog.sellerId;
        // Idempotency: return existing order if already submitted
        if (idempotencyKey) {
            const existing = await this.db.query.orders.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.orders.idempotencyKey, idempotencyKey), (0, drizzle_orm_1.eq)(db_1.orders.sellerId, sellerId)),
            });
            if (existing)
                return existing;
        }
        // Resolve price server-side from product record — NEVER trust client-provided unitPrice
        const orderedItems = await Promise.all(items.map(async (item) => {
            const foundProduct = await this.db.query.products.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.products.id, item.productId), (0, drizzle_orm_1.eq)(db_1.products.sellerId, sellerId)),
            });
            if (!foundProduct) {
                throw new common_1.BadRequestException(`Product ${item.productId} not found in this catalog`);
            }
            // Use b2bPrice if available, otherwise basePrice (catalog price snapshot)
            const resolvedUnitPrice = parseFloat(foundProduct.b2bPrice ?? foundProduct.basePrice);
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
        });
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
            // Release reservations on confirmation via stock movement logic
            // (Full inventory deduction is handled by a dedicated use case in a future phase)
            await this.notificationsQueue.add('ORDER_CONFIRMED', {
                type: 'ORDER_CONFIRMED',
                data: { orderId: id, sellerId },
            });
        }
        if (status === 'rejected' || status === 'cancelled') {
            await this.notificationsQueue.add('ORDER_CANCELLED', {
                type: 'ORDER_CANCELLED',
                data: { orderId: id, sellerId },
            });
        }
        return updated;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DRIZZLE)),
    __param(1, (0, bullmq_1.InjectQueue)('notifications')),
    __metadata("design:paramtypes", [Object, bullmq_2.Queue])
], OrdersService);
