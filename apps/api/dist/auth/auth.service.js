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
let AuthService = class AuthService {
    db;
    jwtService;
    constructor(db, jwtService) {
        this.db = db;
        this.jwtService = jwtService;
    }
    async onModuleInit() {
        console.log('[Database Patch] Verificando integridad de tablas...');
        const exec = async (label, statement) => {
            try {
                await this.db.execute(statement);
            }
            catch (e) {
                console.warn(`[Database Patch] ${label}: ${e.message}`);
            }
        };
        // ── sellers ────────────────────────────────────────────────
        await exec('sellers create', (0, drizzle_orm_1.sql) `
      CREATE TABLE IF NOT EXISTS sellers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
        await exec('sellers cols', (0, drizzle_orm_1.sql) `
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS password TEXT;
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'seller';
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);
        await exec('sellers email unique', (0, drizzle_orm_1.sql) `
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'sellers_email_unique'
        ) THEN
          CREATE UNIQUE INDEX sellers_email_unique ON sellers (email) WHERE email IS NOT NULL;
        END IF;
      END $$;
    `);
        // ── seller_branding ────────────────────────────────────────
        await exec('seller_branding create', (0, drizzle_orm_1.sql) `
      CREATE TABLE IF NOT EXISTS seller_branding (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
        await exec('seller_branding cols', (0, drizzle_orm_1.sql) `
      ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS logo_url TEXT;
      ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS banner_url TEXT;
      ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#FACD01';
      ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#000000';
      ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS whatsapp TEXT;
      ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS instagram TEXT;
      ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS website TEXT;
      ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS payment_methods TEXT;
      ALTER TABLE seller_branding ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);
        await exec('seller_branding unique', (0, drizzle_orm_1.sql) `
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'seller_branding_seller_unique'
        ) THEN
          CREATE UNIQUE INDEX seller_branding_seller_unique ON seller_branding (seller_id);
        END IF;
      END $$;
    `);
        // ── uoms ───────────────────────────────────────────────────
        await exec('uoms', (0, drizzle_orm_1.sql) `
      CREATE TABLE IF NOT EXISTS uoms (
        id SERIAL PRIMARY KEY,
        seller_id UUID NOT NULL REFERENCES sellers(id),
        name TEXT NOT NULL,
        symbol TEXT,
        base_uom_id INTEGER,
        conversion_factor DECIMAL(12, 4) DEFAULT '1.0000'
      );
    `);
        // ── products ───────────────────────────────────────────────
        await exec('products create', (0, drizzle_orm_1.sql) `
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id),
        name TEXT NOT NULL,
        base_uom_id INTEGER NOT NULL REFERENCES uoms(id),
        base_price DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
        await exec('products cols', (0, drizzle_orm_1.sql) `
      ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS b2b_price DECIMAL(12, 2);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS min_order_quantity DECIMAL(12, 4) DEFAULT '1.0000';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
    `);
        // Coerce legacy views column type if it exists as decimal/numeric
        await exec('products views type', (0, drizzle_orm_1.sql) `
      DO $$
      DECLARE col_type TEXT;
      BEGIN
        SELECT data_type INTO col_type FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'views';
        IF col_type IS NOT NULL AND col_type <> 'integer' THEN
          ALTER TABLE products ALTER COLUMN views TYPE INTEGER USING (views::integer);
          ALTER TABLE products ALTER COLUMN views SET DEFAULT 0;
        END IF;
      END $$;
    `);
        await exec('products seller idx', (0, drizzle_orm_1.sql) `
      CREATE INDEX IF NOT EXISTS products_seller_id_idx ON products (seller_id);
    `);
        // ── warehouses ─────────────────────────────────────────────
        await exec('warehouses', (0, drizzle_orm_1.sql) `
      CREATE TABLE IF NOT EXISTS warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id),
        name TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE
      );
    `);
        // ── stock_levels ───────────────────────────────────────────
        await exec('stock_levels create', (0, drizzle_orm_1.sql) `
      CREATE TABLE IF NOT EXISTS stock_levels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id),
        warehouse_id UUID NOT NULL REFERENCES warehouses(id),
        product_id UUID NOT NULL REFERENCES products(id),
        on_hand_base DECIMAL(12, 4) DEFAULT '0.0000',
        reserved_base DECIMAL(12, 4) DEFAULT '0.0000',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
        await exec('stock_levels unique', (0, drizzle_orm_1.sql) `
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'stock_levels_unique'
        ) THEN
          CREATE UNIQUE INDEX stock_levels_unique ON stock_levels (seller_id, warehouse_id, product_id);
        END IF;
      END $$;
    `);
        console.log('[Database Patch] Estructura de base de datos estabilizada.');
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
    async register(registerDto) {
        const name = (registerDto?.name || '').toString().trim();
        const email = (registerDto?.email || '').toString().trim().toLowerCase();
        const password = (registerDto?.password || '').toString();
        const rawSlug = (registerDto?.slug || name).toString();
        const slug = toSlug(rawSlug);
        if (name.length < 2)
            throw new common_1.BadRequestException('Nombre del comercio requerido (mín. 2)');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            throw new common_1.BadRequestException('Email inválido');
        if (password.length < 6)
            throw new common_1.BadRequestException('Contraseña mínima 6 caracteres');
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
            throw new common_1.BadRequestException('Slug inválido');
        const [existing] = await this.db
            .select()
            .from(db_1.sellers)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(db_1.sellers.email, email), (0, drizzle_orm_1.eq)(db_1.sellers.slug, slug)))
            .limit(1);
        if (existing) {
            throw new common_1.BadRequestException('El email o el identificador ya están en uso');
        }
        const [seller] = await this.db
            .insert(db_1.sellers)
            .values({ name, email, password, slug })
            .returning();
        // Sembrar branding por defecto (no crítico, no debe romper el registro si falla)
        try {
            await this.db
                .insert(db_1.sellerBranding)
                .values({
                sellerId: seller.id,
                primaryColor: '#FACD01',
                accentColor: '#000000',
            });
        }
        catch (e) {
            console.warn(`[Register] No se pudo crear branding inicial: ${e.message}`);
        }
        return this.generateResponse(seller);
    }
    async loginWithEmail(emailRaw, pass) {
        const email = emailRaw.trim().toLowerCase();
        // FALLBACK 1: Jhosua Comercial (Siempre prioridad Master)
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
        // FALLBACK 2: Renace Admin
        if ((email === 'admin@renace.tech' || email === 'admi@renace.tech') && pass === 'Admin2026') {
            let [seller] = await this.db.select().from(db_1.sellers).where((0, drizzle_orm_1.eq)(db_1.sellers.email, email)).limit(1);
            if (!seller) {
                [seller] = await this.db.insert(db_1.sellers).values({
                    name: 'Renace Admin',
                    slug: 'renace-admin',
                    email: email,
                    password: pass,
                    role: 'admin'
                }).returning();
            }
            return this.generateResponse(seller);
        }
        // FALLBACK 3: Master Admin Jhosua
        if (email === 'admin@jhosuacomercial.com' && pass === 'Admin2026') {
            let [seller] = await this.db.select().from(db_1.sellers).where((0, drizzle_orm_1.eq)(db_1.sellers.email, email)).limit(1);
            if (!seller) {
                [seller] = await this.db.insert(db_1.sellers).values({
                    name: 'Master Admin',
                    slug: 'master-admin',
                    email: 'admin@jhosuacomercial.com',
                    password: pass,
                    role: 'admin'
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
        const payload = {
            sub: seller.id,
            sellerId: seller.id,
            email: seller.email || `${seller.slug}@catagce.app`,
            role: seller.role || 'seller',
            status: seller.status || 'active'
        };
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
