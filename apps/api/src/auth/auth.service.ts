import { Injectable, Inject, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import {
  sellers, sellerUsers, sellerApiKeys, sellerBranding, sellerSettings,
  warehouses, uoms, priceLists,
} from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async register(data: {
    sellerName: string;
    sellerSlug: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) {
    const [existing] = await this.db
      .select({ id: sellerUsers.id })
      .from(sellerUsers)
      .where(eq(sellerUsers.email, data.email))
      .limit(1);
    if (existing) throw new ConflictException('Email ya registrado');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const apiKey = `cat_${randomBytes(24).toString('hex')}`;

    const [seller] = await this.db.insert(sellers).values({
      name: data.sellerName,
      slug: data.sellerSlug,
      email: data.email,
      phone: data.phone,
    }).returning();

    const [user] = await this.db.insert(sellerUsers).values({
      sellerId: seller.id,
      email: data.email,
      passwordHash,
      name: data.name,
      role: 'owner',
    }).returning();

    await this.db.insert(sellerApiKeys).values({ sellerId: seller.id, key: apiKey, name: 'Default' });
    await this.db.insert(sellerBranding).values({ sellerId: seller.id });
    await this.db.insert(sellerSettings).values({ sellerId: seller.id });

    const [unitUom] = await this.db.insert(uoms).values({
      sellerId: seller.id, name: 'Unidad', symbol: 'un', conversionFactor: '1.0000',
    }).returning();

    await this.db.insert(uoms).values([
      { sellerId: seller.id, name: 'Docena', symbol: 'dz', baseUomId: unitUom.id, conversionFactor: '12.0000' },
      { sellerId: seller.id, name: 'Caja', symbol: 'bx', baseUomId: unitUom.id, conversionFactor: '144.0000' },
    ]);

    await this.db.insert(warehouses).values({ sellerId: seller.id, name: 'Almacén Principal', isDefault: true });
    await this.db.insert(priceLists).values({ sellerId: seller.id, name: 'Lista General', isDefault: true });

    await this.auditService.log({
      sellerId: seller.id, actorUserId: user.id, action: 'seller.registered',
      entityType: 'seller', entityId: seller.id,
    });

    const token = this.signToken(user, seller);
    return { token, apiKey, seller, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  async login(email: string, password: string) {
    if (!email?.trim() || !password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    try {
      const [user] = await this.db
        .select()
        .from(sellerUsers)
        .where(and(eq(sellerUsers.email, email.trim()), eq(sellerUsers.isActive, true)))
        .limit(1);

      if (!user) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      let passwordOk = false;
      try {
        passwordOk = await bcrypt.compare(password, user.passwordHash);
      } catch {
        throw new UnauthorizedException('Credenciales inválidas');
      }
      if (!passwordOk) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      const [seller] = await this.db
        .select()
        .from(sellers)
        .where(eq(sellers.id, user.sellerId))
        .limit(1);
      if (!seller) {
        throw new UnauthorizedException('Cuenta sin vendedor asociado');
      }

      await this.db
        .update(sellerUsers)
        .set({ lastLoginAt: new Date() })
        .where(eq(sellerUsers.id, user.id));

      const [apiKeyRecord] = await this.db
        .select({ key: sellerApiKeys.key })
        .from(sellerApiKeys)
        .where(eq(sellerApiKeys.sellerId, seller.id))
        .limit(1);

      const token = this.signToken(user, seller);
      return {
        token,
        apiKey: apiKeyRecord?.key,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        seller: { id: seller.id, name: seller.name, slug: seller.slug, email: seller.email },
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      console.error('Login failed:', err);
      throw err;
    }
  }

  private signToken(user: any, seller: any) {
    return this.jwtService.sign({
      sub: user.id,
      sellerId: seller.id,
      email: user.email,
      role: user.role,
      sellerName: seller.name,
    });
  }

  async validateJwt(payload: any) {
    const [user] = await this.db
      .select()
      .from(sellerUsers)
      .where(eq(sellerUsers.id, payload.sub))
      .limit(1);

    if (!user || !user.isActive) throw new UnauthorizedException('Usuario inactivo');

    const [seller] = await this.db
      .select({ name: sellers.name })
      .from(sellers)
      .where(eq(sellers.id, user.sellerId))
      .limit(1);

    return {
      userId: user.id,
      sellerId: user.sellerId,
      email: user.email,
      role: user.role,
      sellerName: seller?.name || '',
    };
  }
}
