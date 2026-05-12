import { Injectable, Inject, UnauthorizedException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from '../database/database.module';
import { sellers, sellerBranding } from '@catagce/db';
import { eq, or, sql } from 'drizzle-orm';

function toSlug(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export interface LoginResponse {
  token: string;
  seller: { id: string; name: string; slug: string };
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    console.log('[Database Patch] Verificando integridad de tablas...');
    const exec = async (label: string, statement: any) => {
      try {
        await this.db.execute(statement);
      } catch (e: any) {
        console.warn(`[Database Patch] ${label}: ${e.message}`);
      }
    };

    // ── sellers ────────────────────────────────────────────────
    await exec('sellers create', sql`
      CREATE TABLE IF NOT EXISTS sellers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await exec('sellers cols', sql`
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS password TEXT;
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'seller';
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);
    await exec('sellers email unique', sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'sellers_email_unique'
        ) THEN
          CREATE UNIQUE INDEX sellers_email_unique ON sellers (email) WHERE email IS NOT NULL;
        END IF;
      END $$;
    `);

    // ── seller_branding ────────────────────────────────────────
    await exec('seller_branding create', sql`
      CREATE TABLE IF NOT EXISTS seller_branding (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await exec('seller_branding cols', sql`
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
    await exec('seller_branding unique', sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'seller_branding_seller_unique'
        ) THEN
          CREATE UNIQUE INDEX seller_branding_seller_unique ON seller_branding (seller_id);
        END IF;
      END $$;
    `);

    // ── uoms ───────────────────────────────────────────────────
    await exec('uoms', sql`
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
    await exec('products create', sql`
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
    await exec('products cols', sql`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS b2b_price DECIMAL(12, 2);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS min_order_quantity DECIMAL(12, 4) DEFAULT '1.0000';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
    `);
    // Coerce legacy views column type if it exists as decimal/numeric
    await exec('products views type', sql`
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
    await exec('products seller idx', sql`
      CREATE INDEX IF NOT EXISTS products_seller_id_idx ON products (seller_id);
    `);

    // ── warehouses ─────────────────────────────────────────────
    await exec('warehouses', sql`
      CREATE TABLE IF NOT EXISTS warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id),
        name TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE
      );
    `);

    // ── stock_levels ───────────────────────────────────────────
    await exec('stock_levels create', sql`
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
    await exec('stock_levels unique', sql`
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

  async loginWithSlug(slug: string): Promise<LoginResponse> {
    const [seller] = await this.db
      .select()
      .from(sellers)
      .where(eq(sellers.slug, slug))
      .limit(1);

    if (!seller) {
      throw new UnauthorizedException('Seller not found');
    }

    return this.generateResponse(seller);
  }

  async register(registerDto: any): Promise<LoginResponse> {
    const name = (registerDto?.name || '').toString().trim();
    const email = (registerDto?.email || '').toString().trim().toLowerCase();
    const password = (registerDto?.password || '').toString();
    const rawSlug = (registerDto?.slug || name).toString();
    const slug = toSlug(rawSlug);

    if (name.length < 2) throw new BadRequestException('Nombre del comercio requerido (mín. 2)');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Email inválido');
    if (password.length < 6) throw new BadRequestException('Contraseña mínima 6 caracteres');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new BadRequestException('Slug inválido');

    const [existing] = await this.db
      .select()
      .from(sellers)
      .where(or(eq(sellers.email, email), eq(sellers.slug, slug)))
      .limit(1);

    if (existing) {
      throw new BadRequestException('El email o el identificador ya están en uso');
    }

    const [seller] = await this.db
      .insert(sellers)
      .values({ name, email, password, slug })
      .returning();

    // Sembrar branding por defecto (no crítico, no debe romper el registro si falla)
    try {
      await this.db
        .insert(sellerBranding)
        .values({
          sellerId: seller.id,
          primaryColor: '#FACD01',
          accentColor: '#000000',
        });
    } catch (e: any) {
      console.warn(`[Register] No se pudo crear branding inicial: ${e.message}`);
    }

    return this.generateResponse(seller);
  }

  async loginWithEmail(emailRaw: string, pass: string): Promise<LoginResponse> {
    const email = emailRaw.trim().toLowerCase();

    // FALLBACK 1: Jhosua Comercial (Siempre prioridad Master)
    if (email === 'catalogo@jhosuacomercial.com' && pass === 'Jhosua2027') {
      let [seller] = await this.db.select().from(sellers).where(eq(sellers.email, email)).limit(1);
      if (!seller) {
        [seller] = await this.db.insert(sellers).values({
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
      let [seller] = await this.db.select().from(sellers).where(eq(sellers.email, email)).limit(1);
      if (!seller) {
        [seller] = await this.db.insert(sellers).values({
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
      let [seller] = await this.db.select().from(sellers).where(eq(sellers.email, email)).limit(1);
      if (!seller) {
        [seller] = await this.db.insert(sellers).values({
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
      .from(sellers)
      .where(eq(sellers.email, email))
      .limit(1);

    if (!seller || seller.password !== pass) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateResponse(seller);
  }

  private generateResponse(seller: any): LoginResponse {
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
}
