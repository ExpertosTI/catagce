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
    const existing = await this.db.query.sellerUsers.findFirst({
      where: eq(sellerUsers.email, data.email),
    });
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
    const user = await this.db.query.sellerUsers.findFirst({
      where: and(eq(sellerUsers.email, email), eq(sellerUsers.isActive, true)),
      with: { seller: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.db.update(sellerUsers).set({ lastLoginAt: new Date() }).where(eq(sellerUsers.id, user.id));

    const token = this.signToken(user, user.seller);
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      seller: user.seller,
    };
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
    const user = await this.db.query.sellerUsers.findFirst({
      where: eq(sellerUsers.id, payload.sub),
      with: { seller: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Usuario inactivo');
    return {
      userId: user.id,
      sellerId: user.sellerId,
      email: user.email,
      role: user.role,
      sellerName: user.seller?.name || '',
    };
  }
}
