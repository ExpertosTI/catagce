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
var CatalogsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogsService = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const db_1 = require("@catagce/db");
const drizzle_orm_1 = require("drizzle-orm");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let CatalogsService = CatalogsService_1 = class CatalogsService {
    db;
    renderQueue;
    logger = new common_1.Logger(CatalogsService_1.name);
    constructor(db, renderQueue) {
        this.db = db;
        this.renderQueue = renderQueue;
    }
    async findAll(sellerId) {
        return this.db.query.catalogs.findMany({
            where: (0, drizzle_orm_1.eq)(db_1.catalogs.sellerId, sellerId),
            with: {
                catalogProducts: {
                    with: { product: true },
                },
            },
            orderBy: (c, { desc }) => [desc(c.createdAt)],
        });
    }
    async findBySlug(slug) {
        if (!slug || slug.length < 2)
            throw new common_1.BadRequestException('slug requerido');
        const catalog = await this.db.query.catalogs.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.catalogs.slug, slug), (0, drizzle_orm_1.eq)(db_1.catalogs.isActive, true)),
            with: {
                catalogProducts: {
                    with: { product: true },
                },
                seller: { with: { branding: true } },
            },
        });
        if (!catalog)
            throw new common_1.NotFoundException('Catalog not found');
        return catalog;
    }
    async create(sellerId, data) {
        // Catalog slugs are globally unique — pre-check for a friendlier error.
        const [existing] = await this.db
            .select({ id: db_1.catalogs.id })
            .from(db_1.catalogs)
            .where((0, drizzle_orm_1.eq)(db_1.catalogs.slug, data.slug))
            .limit(1);
        if (existing)
            throw new common_1.BadRequestException('Ya existe un catálogo con ese slug');
        const [created] = await this.db
            .insert(db_1.catalogs)
            .values({
            sellerId,
            name: data.name,
            slug: data.slug,
            description: data.description ?? null,
            isActive: data.isActive ?? true,
        })
            .returning();
        return created;
    }
    async addProduct(sellerId, catalogId, productId) {
        const [cat] = await this.db
            .select()
            .from(db_1.catalogs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.catalogs.id, catalogId), (0, drizzle_orm_1.eq)(db_1.catalogs.sellerId, sellerId)))
            .limit(1);
        if (!cat)
            throw new common_1.NotFoundException('Catalog not found');
        const [prod] = await this.db
            .select()
            .from(db_1.products)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.products.id, productId), (0, drizzle_orm_1.eq)(db_1.products.sellerId, sellerId)))
            .limit(1);
        if (!prod)
            throw new common_1.NotFoundException('Product not found');
        const existing = await this.db
            .select()
            .from(db_1.catalogProducts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.catalogProducts.catalogId, catalogId), (0, drizzle_orm_1.eq)(db_1.catalogProducts.productId, productId)))
            .limit(1);
        if (existing.length)
            return existing[0];
        const [created] = await this.db
            .insert(db_1.catalogProducts)
            .values({ catalogId, productId })
            .returning();
        return created;
    }
    async removeProduct(sellerId, catalogId, productId) {
        const [cat] = await this.db
            .select()
            .from(db_1.catalogs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.catalogs.id, catalogId), (0, drizzle_orm_1.eq)(db_1.catalogs.sellerId, sellerId)))
            .limit(1);
        if (!cat)
            throw new common_1.NotFoundException('Catalog not found');
        await this.db
            .delete(db_1.catalogProducts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.catalogProducts.catalogId, catalogId), (0, drizzle_orm_1.eq)(db_1.catalogProducts.productId, productId)));
        return { ok: true };
    }
    async enqueuePdfRender(sellerId, catalogId) {
        const [cat] = await this.db
            .select()
            .from(db_1.catalogs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.catalogs.id, catalogId), (0, drizzle_orm_1.eq)(db_1.catalogs.sellerId, sellerId)))
            .limit(1);
        if (!cat)
            throw new common_1.NotFoundException('Catalog not found');
        const job = await this.renderQueue.add('render-pdf', { catalogId, sellerId }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 50, removeOnFail: 200 });
        return { jobId: job.id, status: 'queued' };
    }
    async remove(sellerId, id) {
        try {
            await this.db
                .delete(db_1.catalogs)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.catalogs.id, id), (0, drizzle_orm_1.eq)(db_1.catalogs.sellerId, sellerId)));
            return { ok: true };
        }
        catch (e) {
            this.logger.error(`Catalog remove failed: ${e.message}`);
            throw new common_1.BadRequestException(`No se pudo eliminar el catálogo: ${e.message}`);
        }
    }
};
exports.CatalogsService = CatalogsService;
exports.CatalogsService = CatalogsService = CatalogsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DRIZZLE)),
    __param(1, (0, bullmq_1.InjectQueue)('catalog-render')),
    __metadata("design:paramtypes", [Object, bullmq_2.Queue])
], CatalogsService);
