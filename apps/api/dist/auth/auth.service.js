"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const database_module_1 = require("../database/database.module");
const db_1 = require("@catagce/db");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt = __importStar(require("bcryptjs"));
const BCRYPT_COST = 10;
const BCRYPT_PREFIX = /^\$2[aby]\$/;
function toSlug(input) {
    return input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}
function isValidEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function isValidSlug(s) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 2 && s.length <= 60;
}
let AuthService = AuthService_1 = class AuthService {
    db;
    jwtService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(db, jwtService) {
        this.db = db;
        this.jwtService = jwtService;
    }
    async onModuleInit() {
        await this.bootstrapEntity({
            email: process.env.BOOTSTRAP_ADMIN_EMAIL,
            password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
            name: process.env.BOOTSTRAP_ADMIN_NAME || 'Catagce Super Admin',
            slug: process.env.BOOTSTRAP_ADMIN_SLUG,
            role: 'admin',
        });
        await this.bootstrapEntity({
            email: process.env.BOOTSTRAP_TENANT_EMAIL,
            password: process.env.BOOTSTRAP_TENANT_PASSWORD,
            name: process.env.BOOTSTRAP_TENANT_NAME || 'Jhosua Comercial',
            slug: process.env.BOOTSTRAP_TENANT_SLUG || 'jhosuacom',
            role: 'seller',
        });
    }
    /**
     * One-time entity bootstrap from env. Idempotent: if an entity with the same
     * email exists, nothing is created.
     */
    async bootstrapEntity(config) {
        const email = config.email?.trim().toLowerCase();
        const password = config.password?.trim();
        if (!email || !password)
            return;
        if (!isValidEmail(email) || password.length < 8) {
            this.logger.warn(`BOOTSTRAP_${config.role.toUpperCase()}_* are set but invalid; skipping.`);
            return;
        }
        try {
            const [existing] = await this.db
                .select()
                .from(db_1.sellers)
                .where((0, drizzle_orm_1.eq)(db_1.sellers.email, email))
                .limit(1);
            if (existing)
                return;
            const hashed = await bcrypt.hash(password, BCRYPT_COST);
            const slug = toSlug(config.slug || email.split('@')[0]);
            const [seller] = await this.db
                .insert(db_1.sellers)
                .values({
                name: config.name,
                slug: isValidSlug(slug) ? slug : `${config.role}-${Date.now()}`,
                email,
                password: hashed,
                role: config.role,
            })
                .returning();
            await this.db.insert(db_1.sellerBranding).values({
                sellerId: seller.id,
                primaryColor: '#FACD01',
                accentColor: '#000000',
            });
            await this.db.insert(db_1.warehouses).values({
                sellerId: seller.id,
                name: 'Almacén Principal',
                isDefault: true,
            });
            this.logger.log(`Bootstrap ${config.role} created: ${email}`);
        }
        catch (err) {
            this.logger.warn(`Bootstrap ${config.role} failed: ${err.message}`);
        }
    }
    async register(dto) {
        const name = (dto?.name || '').toString().trim();
        const email = (dto?.email || '').toString().trim().toLowerCase();
        const password = (dto?.password || '').toString();
        const slug = toSlug((dto?.slug || name).toString());
        if (name.length < 2)
            throw new common_1.BadRequestException('Nombre requerido (mín. 2)');
        if (!isValidEmail(email))
            throw new common_1.BadRequestException('Email inválido');
        if (password.length < 8)
            throw new common_1.BadRequestException('Contraseña mínima 8 caracteres');
        if (!isValidSlug(slug))
            throw new common_1.BadRequestException('Identificador inválido');
        const [conflict] = await this.db
            .select()
            .from(db_1.sellers)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(db_1.sellers.email, email), (0, drizzle_orm_1.eq)(db_1.sellers.slug, slug)))
            .limit(1);
        if (conflict) {
            throw new common_1.ConflictException('El email o el identificador ya están en uso');
        }
        const hashed = await bcrypt.hash(password, BCRYPT_COST);
        const [seller] = await this.db
            .insert(db_1.sellers)
            .values({ name, email, password: hashed, slug })
            .returning();
        try {
            await this.db
                .insert(db_1.sellerBranding)
                .values({
                sellerId: seller.id,
                primaryColor: '#FACD01',
                accentColor: '#000000',
            });
            await this.db
                .insert(db_1.warehouses)
                .values({
                sellerId: seller.id,
                name: 'Almacén Principal',
                isDefault: true,
            });
        }
        catch (e) {
            this.logger.warn(`Default branding not seeded for ${seller.id}: ${e.message}`);
        }
        return this.issueToken(seller);
    }
    async loginWithEmail(emailRaw, password) {
        const email = (emailRaw || '').trim().toLowerCase();
        if (!email || !password) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const [seller] = await this.db
            .select()
            .from(db_1.sellers)
            .where((0, drizzle_orm_1.eq)(db_1.sellers.email, email))
            .limit(1);
        if (!seller || !seller.password) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        if (seller.status && seller.status !== 'active') {
            throw new common_1.UnauthorizedException('Cuenta inactiva');
        }
        let valid = false;
        if (BCRYPT_PREFIX.test(seller.password)) {
            valid = await bcrypt.compare(password, seller.password);
        }
        else {
            // Legacy plaintext password — accept once, then upgrade to bcrypt.
            if (seller.password === password) {
                valid = true;
                try {
                    const upgraded = await bcrypt.hash(password, BCRYPT_COST);
                    await this.db
                        .update(db_1.sellers)
                        .set({ password: upgraded, updatedAt: new Date() })
                        .where((0, drizzle_orm_1.eq)(db_1.sellers.id, seller.id));
                }
                catch {
                    /* non-blocking */
                }
            }
        }
        if (!valid)
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        return this.issueToken(seller);
    }
    issueToken(seller) {
        const role = seller.role || 'seller';
        const payload = {
            sub: seller.id,
            sellerId: seller.id,
            email: seller.email,
            role,
        };
        return {
            token: this.jwtService.sign(payload),
            seller: { id: seller.id, name: seller.name, slug: seller.slug, role },
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, jwt_1.JwtService])
], AuthService);
