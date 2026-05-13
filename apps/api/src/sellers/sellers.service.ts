import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { sellers, sellerBranding } from '@catagce/db';
import { eq } from 'drizzle-orm';

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
] as const;

type BrandingField = (typeof BRANDING_FIELDS)[number];

const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

function pickBranding(input: any): Partial<Record<BrandingField, string | null>> {
  if (!input || typeof input !== 'object') return {};
  const out: any = {};
  for (const key of BRANDING_FIELDS) {
    if (key in input) {
      const v = input[key];
      out[key] = v === '' ? null : v;
    }
  }
  return out;
}

@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async getBranding(sellerId: string) {
    let branding: any = null;
    try {
      [branding] = await this.db
        .select()
        .from(sellerBranding)
        .where(eq(sellerBranding.sellerId, sellerId))
        .limit(1);
    } catch (e: any) {
      this.logger.error(`Branding select failed: ${e.message}`);
      return this.defaultBranding(sellerId);
    }

    if (!branding) {
      try {
        [branding] = await this.db
          .insert(sellerBranding)
          .values({ sellerId })
          .returning();
      } catch (e: any) {
        this.logger.warn(`Could not create default branding for ${sellerId}: ${e.message}`);
        return this.defaultBranding(sellerId);
      }
    }
    return branding;
  }

  private defaultBranding(sellerId: string) {
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

  async updateBranding(sellerId: string, raw: any) {
    const data = pickBranding(raw);

    // Flexibilidad para el color: Autocompletar # si falta
    if (data.primaryColor && typeof data.primaryColor === 'string') {
      if (!data.primaryColor.startsWith('#')) data.primaryColor = `#${data.primaryColor}`;
      if (!HEX.test(data.primaryColor)) throw new BadRequestException('Color primario inválido');
    }

    // Limpieza de Instagram: Quitar @ si existe
    if (data.instagram && typeof data.instagram === 'string') {
      data.instagram = data.instagram.replace('@', '').trim();
    }

    // Limpieza de WhatsApp: Solo números
    if (data.whatsapp && typeof data.whatsapp === 'string') {
      data.whatsapp = data.whatsapp.replace(/[^0-9]/g, '');
    }

    // El frontend a veces envía `name` (nombre del comercio)
    if (typeof raw?.name === 'string' && raw.name.trim().length >= 2) {
      try {
        await this.db
          .update(sellers)
          .set({ name: raw.name.trim(), updatedAt: new Date() })
          .where(eq(sellers.id, sellerId));
      } catch (e: any) {
        this.logger.warn(`Could not update seller name: ${e.message}`);
      }
    }

    if (Object.keys(data).length === 0) {
      return this.getProfile(sellerId);
    }

    try {
      const [existing] = await this.db
        .select({ id: sellerBranding.id })
        .from(sellerBranding)
        .where(eq(sellerBranding.sellerId, sellerId))
        .limit(1);

      if (existing) {
        await this.db
          .update(sellerBranding)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(sellerBranding.sellerId, sellerId));
      } else {
        await this.db
          .insert(sellerBranding)
          .values({ ...data, sellerId, updatedAt: new Date() });
      }
    } catch (e: any) {
      this.logger.error(`Branding upsert failed: ${e.message}`);
      throw new BadRequestException(`No se pudo actualizar el branding: ${e.message}`);
    }

    return this.getProfile(sellerId);
  }

  async getProfile(sellerId: string) {
    let seller: any = null;
    try {
      [seller] = await this.db
        .select()
        .from(sellers)
        .where(eq(sellers.id, sellerId))
        .limit(1);
    } catch (e: any) {
      this.logger.error(`Seller select failed: ${e.message}`);
    }

    const branding = await this.getBranding(sellerId);

    if (!seller) {
      return { id: sellerId, name: '', slug: '', branding };
    }

    return { ...seller, branding };
  }

  async findAll() {
    return this.db.select().from(sellers);
  }

  async create(data: any) {
    const { name, email, password, slug } = data;
    if (!name || !email || !password || !slug) {
      throw new BadRequestException('Faltan datos obligatorios (name, email, password, slug)');
    }

    const [existing] = await this.db
      .select({ id: sellers.id })
      .from(sellers)
      .where(eq(sellers.slug, slug.toLowerCase()))
      .limit(1);
    if (existing) throw new BadRequestException('Ya existe un comercio con ese slug');

    const b = require('bcryptjs');
    const hashedPassword = b.hashSync(password, 10);

    const [created] = await this.db
      .insert(sellers)
      .values({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        slug: slug.toLowerCase(),
        role: 'seller',
        status: 'active',
      })
      .returning();
    
    // Inicializar infraestructura base para el nuevo seller
    await this.db.insert(sellerBranding).values({ sellerId: created.id }).onConflictDoNothing();
    
    return created;
  }
}
