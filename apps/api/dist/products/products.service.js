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
var ProductsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const db_1 = require("@catagce/db");
const drizzle_orm_1 = require("drizzle-orm");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let ProductsService = ProductsService_1 = class ProductsService {
    db;
    mediaQueue;
    logger = new common_1.Logger(ProductsService_1.name);
    constructor(db, mediaQueue) {
        this.db = db;
        this.mediaQueue = mediaQueue;
    }
    async findAll(sellerId) {
        try {
            return await this.db.query.products.findMany({
                where: (0, drizzle_orm_1.eq)(db_1.products.sellerId, sellerId),
                with: {
                    stockLevels: true,
                    baseUom: true,
                },
            });
        }
        catch (e) {
            // Fallback if relational query fails (e.g. legacy schema): plain select.
            this.logger.warn(`Relational findMany failed, falling back: ${e.message}`);
            try {
                const rows = await this.db
                    .select()
                    .from(db_1.products)
                    .where((0, drizzle_orm_1.eq)(db_1.products.sellerId, sellerId));
                return rows.map((r) => ({ ...r, stockLevels: [], baseUom: null }));
            }
            catch (err) {
                this.logger.error(`Products findAll failed: ${err.message}`);
                return [];
            }
        }
    }
    async resolveDefaultUom(sellerId) {
        const existing = await this.db
            .select()
            .from(db_1.uoms)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.uoms.sellerId, sellerId), (0, drizzle_orm_1.eq)(db_1.uoms.symbol, 'un')))
            .limit(1);
        if (existing.length)
            return existing[0].id;
        const [created] = await this.db
            .insert(db_1.uoms)
            .values({ sellerId, name: 'Unidad', symbol: 'un', conversionFactor: '1.0000' })
            .returning();
        return created.id;
    }
    async create(sellerId, data) {
        if (!data?.name || data?.basePrice == null) {
            throw new common_1.BadRequestException('name y basePrice son requeridos');
        }
        const baseUomId = data.baseUomId ?? (await this.resolveDefaultUom(sellerId));
        let product;
        try {
            [product] = await this.db
                .insert(db_1.products)
                .values({
                name: String(data.name).trim(),
                sku: data.sku ?? null,
                description: data.description ?? null,
                basePrice: String(data.basePrice),
                b2bPrice: data.b2bPrice ? String(data.b2bPrice) : null,
                minOrderQuantity: data.minOrderQuantity || '1.0000',
                isActive: data.isActive ?? true,
                imageUrl: data.imageUrl ?? null,
                sellerId,
                baseUomId,
            })
                .returning();
        }
        catch (e) {
            this.logger.error(`Product insert failed: ${e.message}`);
            throw new common_1.BadRequestException(`No se pudo crear el producto: ${e.message}`);
        }
        if (product?.imageUrl) {
            try {
                await this.mediaQueue.add('process-product-media', { productId: product.id, imageUrl: product.imageUrl, sellerId }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 100, removeOnFail: 500 });
            }
            catch (e) {
                this.logger.warn(`Media queue enqueue failed: ${e.message}`);
            }
        }
        return product;
    }
    async incrementViews(id) {
        try {
            const [product] = await this.db
                .update(db_1.products)
                .set({ views: (0, drizzle_orm_1.sql) `${db_1.products.views} + 1` })
                .where((0, drizzle_orm_1.eq)(db_1.products.id, id))
                .returning();
            return product ?? null;
        }
        catch (e) {
            this.logger.warn(`incrementViews failed: ${e.message}`);
            return null;
        }
    }
    async remove(sellerId, id) {
        try {
            await this.db
                .delete(db_1.products)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.products.id, id), (0, drizzle_orm_1.eq)(db_1.products.sellerId, sellerId)));
            return { ok: true };
        }
        catch (e) {
            this.logger.error(`Product remove failed: ${e.message}`);
            throw new common_1.BadRequestException(`No se pudo eliminar el producto: ${e.message}`);
        }
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DRIZZLE)),
    __param(1, (0, bullmq_1.InjectQueue)('media')),
    __metadata("design:paramtypes", [Object, bullmq_2.Queue])
], ProductsService);
