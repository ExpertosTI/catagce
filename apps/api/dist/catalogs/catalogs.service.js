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
exports.CatalogsService = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const db_1 = require("@catagce/db");
const drizzle_orm_1 = require("drizzle-orm");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let CatalogsService = class CatalogsService {
    db;
    renderQueue;
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
        });
    }
    async findBySlug(slug) {
        const catalog = await this.db.query.catalogs.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.catalogs.slug, slug), (0, drizzle_orm_1.eq)(db_1.catalogs.isActive, true)),
            with: {
                catalogProducts: {
                    with: { product: true },
                },
                seller: {
                    with: { branding: true }
                }
            },
        });
        if (!catalog) {
            throw new common_1.NotFoundException('Catalog not found');
        }
        return catalog;
    }
    async create(sellerId, data) {
        const [catalog] = await this.db
            .insert(db_1.catalogs)
            .values({ ...data, sellerId })
            .returning();
        return catalog;
    }
    async enqueuePdfRender(catalogId, sellerId) {
        return this.renderQueue.add('render-pdf', { catalogId, sellerId });
    }
};
exports.CatalogsService = CatalogsService;
exports.CatalogsService = CatalogsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DRIZZLE)),
    __param(1, (0, bullmq_1.InjectQueue)('catalog-render')),
    __metadata("design:paramtypes", [Object, bullmq_2.Queue])
], CatalogsService);
