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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const db_1 = require("@catagce/db");
const drizzle_orm_1 = require("drizzle-orm");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let ProductsService = class ProductsService {
    db;
    mediaQueue;
    constructor(db, mediaQueue) {
        this.db = db;
        this.mediaQueue = mediaQueue;
    }
    async findAll(sellerId) {
        return this.db.query.products.findMany({
            where: (0, drizzle_orm_1.eq)(db_1.products.sellerId, sellerId),
            with: {
                stockLevels: true,
                baseUom: true,
            },
        });
    }
    async create(sellerId, data) {
        const [product] = await this.db
            .insert(db_1.products)
            .values({
            ...data,
            sellerId,
            minOrderQuantity: data.minOrderQuantity || '1.0000',
            b2bPrice: data.b2bPrice || null,
        })
            .returning();
        if (product.imageUrl) {
            await this.mediaQueue.add('process-product-media', {
                productId: product.id,
                imageUrl: product.imageUrl,
                sellerId,
            });
        }
        return product;
    }
    async incrementViews(id) {
        const [product] = await this.db
            .update(db_1.products)
            .set({ views: (0, drizzle_orm_1.sql) `${db_1.products.views} + 1` })
            .where((0, drizzle_orm_1.eq)(db_1.products.id, id))
            .returning();
        return product;
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DRIZZLE)),
    __param(1, (0, bullmq_1.InjectQueue)('media')),
    __metadata("design:paramtypes", [Object, bullmq_2.Queue])
], ProductsService);
