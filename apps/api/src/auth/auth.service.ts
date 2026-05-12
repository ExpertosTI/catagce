import { Injectable, Inject, UnauthorizedException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from '../database/database.module';
import { sellers } from '@catagce/db';
import { eq, or, sql } from 'drizzle-orm';

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
    try {
      // 1. Parche para la tabla sellers (role y status)
      await this.db.execute(sql`
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'seller';
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
      `);

      // 2. Asegurar que existe seller_branding
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS seller_branding (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seller_id UUID NOT NULL UNIQUE REFERENCES sellers(id),
          logo_url TEXT,
          banner_url TEXT,
          primary_color TEXT DEFAULT '#00D1FF',
          accent_color TEXT DEFAULT '#000000',
          phone TEXT,
          whatsapp TEXT,
          address TEXT,
          instagram TEXT,
          website TEXT,
          description TEXT,
          payment_methods TEXT,
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // 3. Asegurar que existe uoms
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS uoms (
          id SERIAL PRIMARY KEY,
          seller_id UUID NOT NULL REFERENCES sellers(id),
          name TEXT NOT NULL,
          symbol TEXT,
          base_uom_id INTEGER,
          conversion_factor DECIMAL(12, 4) DEFAULT '1.0000'
        );
      `);

      // 4. Asegurar que existe products
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seller_id UUID NOT NULL REFERENCES sellers(id),
          name TEXT NOT NULL,
          sku TEXT,
          description TEXT,
          base_uom_id INTEGER NOT NULL REFERENCES uoms(id),
          base_price DECIMAL(12, 2) NOT NULL,
          b2b_price DECIMAL(12, 2),
          min_order_quantity DECIMAL(12, 4) DEFAULT '1.0000',
          is_active BOOLEAN DEFAULT TRUE,
          image_url TEXT,
          views INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // 5. Asegurar que existe warehouses (requerido para stock_levels)
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS warehouses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seller_id UUID NOT NULL REFERENCES sellers(id),
          name TEXT NOT NULL,
          is_default BOOLEAN DEFAULT FALSE
        );
      `);

      // 6. Asegurar que existe stock_levels
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS stock_levels (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seller_id UUID NOT NULL REFERENCES sellers(id),
          warehouse_id UUID NOT NULL REFERENCES warehouses(id),
          product_id UUID NOT NULL REFERENCES products(id),
          on_hand_base DECIMAL(12, 4) DEFAULT '0.0000',
          reserved_base DECIMAL(12, 4) DEFAULT '0.0000',
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(seller_id, warehouse_id, product_id)
        );
      `);

      console.log('[Database Patch] Estructura de base de datos estabilizada.');
    } catch (e: any) {
      console.warn('[Database Patch] Error aplicando parches:', e.message);
    }
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
    const { name, email, password, slug } = registerDto;
    
    // Check if email or slug already exists
    const [existing] = await this.db
      .select()
      .from(sellers)
      .where(or(eq(sellers.email, email.toLowerCase()), eq(sellers.slug, slug.toLowerCase())))
      .limit(1);

    if (existing) {
      throw new BadRequestException('Email or Slug already in use');
    }

    const [seller] = await this.db.insert(sellers).values({
      name,
      email: email.toLowerCase(),
      password,
      slug: slug.toLowerCase()
    }).returning();

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
