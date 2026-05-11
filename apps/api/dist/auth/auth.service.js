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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const database_module_1 = require("../database/database.module");
const db_1 = require("@catagce/db");
const drizzle_orm_1 = require("drizzle-orm");
let AuthService = class AuthService {
    db;
    jwtService;
    constructor(db, jwtService) {
        this.db = db;
        this.jwtService = jwtService;
    }
    async loginWithSlug(slug) {
        const [seller] = await this.db
            .select()
            .from(db_1.sellers)
            .where((0, drizzle_orm_1.eq)(db_1.sellers.slug, slug))
            .limit(1);
        if (!seller) {
            throw new common_1.UnauthorizedException('Seller not found');
        }
        return this.generateResponse(seller);
    }
    async loginWithEmail(emailRaw, pass) {
        const email = emailRaw.trim().toLowerCase();
        // FALLBACK 1: Jhosua Comercial
        if (email === 'catalogo@jhosuacomercial.com' && pass === 'Jhosua2027') {
            let [seller] = await this.db.select().from(db_1.sellers).where((0, drizzle_orm_1.eq)(db_1.sellers.email, email)).limit(1);
            if (!seller) {
                [seller] = await this.db.insert(db_1.sellers).values({
                    name: 'Jhosua Comercial',
                    slug: 'jhosuacomercial',
                    email: 'catalogo@jhosuacomercial.com',
                    password: pass,
                }).returning();
            }
            return this.generateResponse(seller);
        }
        // FALLBACK 2: Renace Admin (Master)
        if (email === 'admin@renace.tech' && pass === 'Renace2026') {
            let [seller] = await this.db.select().from(db_1.sellers).where((0, drizzle_orm_1.eq)(db_1.sellers.email, email)).limit(1);
            if (!seller) {
                [seller] = await this.db.insert(db_1.sellers).values({
                    name: 'Renace Admin',
                    slug: 'renace-admin',
                    email: 'admin@renace.tech',
                    password: pass,
                }).returning();
            }
            return this.generateResponse(seller);
        }
        const [seller] = await this.db
            .select()
            .from(db_1.sellers)
            .where((0, drizzle_orm_1.eq)(db_1.sellers.email, email))
            .limit(1);
        if (!seller || seller.password !== pass) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return this.generateResponse(seller);
    }
    generateResponse(seller) {
        const payload = { sub: seller.id, sellerId: seller.id, email: seller.email || `${seller.slug}@catagce.app` };
        return {
            token: this.jwtService.sign(payload),
            seller: { id: seller.id, name: seller.name, slug: seller.slug },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, jwt_1.JwtService])
], AuthService);
