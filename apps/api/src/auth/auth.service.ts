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

    const payload = { sub: seller.id, sellerId: seller.id, email: `${slug}@catagce.app` };
    return {
      token: this.jwtService.sign(payload),
      seller: { id: seller.id, name: seller.name, slug: seller.slug },
    };
  }
}
