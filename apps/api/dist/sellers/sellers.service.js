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
var SellersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SellersService = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const db_1 = require("@catagce/db");
const drizzle_orm_1 = require("drizzle-orm");
const BRANDING_FIELDS = [
    'logoUrl',
    'bannerUrl',
    'primaryColor',
    'accentColor',
    'phone',
    'whatsapp',
    'address',
    'instagram',
    'website',
    'description',
    'paymentMethods',
];
const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;
function pickBranding(input) {
    if (!input || typeof input !== 'object')
        return {};
    const out = {};
    for (const key of BRANDING_FIELDS) {
        if (key in input) {
            const v = input[key];
            out[key] = v === '' ? null : v;
        }
    }
    return out;
}
let SellersService = SellersService_1 = class SellersService {
    db;
    logger = new common_1.Logger(SellersService_1.name);
    constructor(db) {
        this.db = db;
    }
    async getBranding(sellerId) {
        let branding = null;
        try {
            [branding] = await this.db
                .select()
                .from(db_1.sellerBranding)
                .where((0, drizzle_orm_1.eq)(db_1.sellerBranding.sellerId, sellerId))
                .limit(1);
        }
        catch (e) {
            this.logger.error(`Branding select failed: ${e.message}`);
            return this.defaultBranding(sellerId);
        }
        if (!branding) {
            try {
                [branding] = await this.db
                    .insert(db_1.sellerBranding)
                    .values({ sellerId })
                    .returning();
            }
            catch (e) {
                this.logger.warn(`Could not create default branding for ${sellerId}: ${e.message}`);
                return this.defaultBranding(sellerId);
            }
        }
        return branding;
    }
    defaultBranding(sellerId) {
        return {
            sellerId,
            primaryColor: '#FACD01',
            accentColor: '#000000',
            logoUrl: null,
            bannerUrl: null,
            phone: null,
            whatsapp: null,
            address: null,
            instagram: null,
            website: null,
            description: null,
            paymentMethods: null,
        };
    }
    async updateBranding(sellerId, raw) {
        const data = pickBranding(raw);
        if (data.primaryColor && !HEX.test(String(data.primaryColor))) {
            throw new common_1.BadRequestException('primaryColor inválido (usa #RRGGBB)');
        }
        if (data.accentColor && !HEX.test(String(data.accentColor))) {
            throw new common_1.BadRequestException('accentColor inválido (usa #RRGGBB)');
        }
        // El frontend a veces envía `name` (nombre del comercio):
        // se guarda en `sellers`, no en `seller_branding`.
        if (typeof raw?.name === 'string' && raw.name.trim().length >= 2) {
            try {
                await this.db
                    .update(db_1.sellers)
                    .set({ name: raw.name.trim(), updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(db_1.sellers.id, sellerId));
            }
            catch (e) {
                this.logger.warn(`Could not update seller name: ${e.message}`);
            }
        }
        if (Object.keys(data).length === 0) {
            return this.getProfile(sellerId);
        }
        try {
            const [existing] = await this.db
                .select({ id: db_1.sellerBranding.id })
                .from(db_1.sellerBranding)
                .where((0, drizzle_orm_1.eq)(db_1.sellerBranding.sellerId, sellerId))
                .limit(1);
            if (existing) {
                await this.db
                    .update(db_1.sellerBranding)
                    .set({ ...data, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(db_1.sellerBranding.sellerId, sellerId));
            }
            else {
                await this.db
                    .insert(db_1.sellerBranding)
                    .values({ ...data, sellerId, updatedAt: new Date() });
            }
        }
        catch (e) {
            this.logger.error(`Branding upsert failed: ${e.message}`);
            throw new common_1.BadRequestException(`No se pudo actualizar el branding: ${e.message}`);
        }
        return this.getProfile(sellerId);
    }
    async getProfile(sellerId) {
        let seller = null;
        try {
            [seller] = await this.db
                .select()
                .from(db_1.sellers)
                .where((0, drizzle_orm_1.eq)(db_1.sellers.id, sellerId))
                .limit(1);
        }
        catch (e) {
            this.logger.error(`Seller select failed: ${e.message}`);
        }
        const branding = await this.getBranding(sellerId);
        if (!seller) {
            return { id: sellerId, name: '', slug: '', branding };
        }
        return { ...seller, branding };
    }
    async findAll() {
        return this.db.select().from(db_1.sellers);
    }
};
exports.SellersService = SellersService;
exports.SellersService = SellersService = SellersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], SellersService);
