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
exports.SellersService = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const db_1 = require("@catagce/db");
const drizzle_orm_1 = require("drizzle-orm");
let SellersService = class SellersService {
    db;
    constructor(db) {
        this.db = db;
    }
    async getBranding(sellerId) {
        let [branding] = await this.db
            .select()
            .from(db_1.sellerBranding)
            .where((0, drizzle_orm_1.eq)(db_1.sellerBranding.sellerId, sellerId))
            .limit(1);
        if (!branding) {
            // Create default branding if missing
            [branding] = await this.db
                .insert(db_1.sellerBranding)
                .values({ sellerId })
                .returning();
        }
        return branding;
    }
    async updateBranding(sellerId, data) {
        const [updated] = await this.db
            .insert(db_1.sellerBranding)
            .values({ ...data, sellerId, updatedAt: new Date() })
            .onConflictDoUpdate({
            target: db_1.sellerBranding.sellerId,
            set: { ...data, updatedAt: new Date() },
        })
            .returning();
        return updated;
    }
    async getProfile(sellerId) {
        const [seller] = await this.db
            .select()
            .from(db_1.sellers)
            .where((0, drizzle_orm_1.eq)(db_1.sellers.id, sellerId))
            .limit(1);
        const branding = await this.getBranding(sellerId);
        return { ...seller, branding };
    }
    async findAll() {
        return this.db.select().from(db_1.sellers);
    }
};
exports.SellersService = SellersService;
exports.SellersService = SellersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], SellersService);
