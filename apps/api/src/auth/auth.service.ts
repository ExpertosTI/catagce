import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from '../database/database.module';
import { sellers } from '@catagce/db';
import { eq } from 'drizzle-orm';

export interface LoginResponse {
  token: string;
  seller: { id: string; name: string; slug: string };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly jwtService: JwtService,
  ) {}

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

    // FALLBACK 2: Renace Admin (Siempre prioridad Master)
    if (email === 'admin@renace.tech' && pass === 'Renace2026') {
      let [seller] = await this.db.select().from(sellers).where(eq(sellers.email, email)).limit(1);
      if (!seller) {
        [seller] = await this.db.insert(sellers).values({
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
