import { Injectable, Inject, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { companies, staffUsers, clients, warehouses, priceLists } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';

export type AuthUser = {
  userId: string;
  companyId: string;
  email: string;
  name: string;
  role: string;
  type: 'staff' | 'client';
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private jwtService: JwtService,
  ) {}

  async registerStaff(data: {
    companyName: string;
    companySlug: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) {
    const slug = data.companySlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (!slug) throw new ConflictException('Slug de empresa inválido');

    const [existing] = await this.db.select({ id: staffUsers.id }).from(staffUsers)
      .where(eq(staffUsers.email, data.email.trim())).limit(1);
    if (existing) throw new ConflictException('Email ya registrado');

    const passwordHash = await bcrypt.hash(data.password, 12);

    const [company] = await this.db.insert(companies).values({
      name: data.companyName.trim(),
      slug,
      email: data.email.trim(),
      phone: data.phone?.trim(),
    }).returning();

    const [user] = await this.db.insert(staffUsers).values({
      companyId: company.id,
      email: data.email.trim(),
      passwordHash,
      name: data.name.trim(),
      role: 'owner',
    }).returning();

    await this.db.insert(warehouses).values({
      companyId: company.id, name: 'Almacén Principal', isDefault: true,
    });
    await this.db.insert(priceLists).values({
      companyId: company.id, name: 'Lista General', isDefault: true,
    });

    const token = this.signToken(user, company, 'staff');
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      company: { id: company.id, name: company.name, slug: company.slug },
    };
  }

  async loginStaff(email: string, password: string) {
    const [user] = await this.db.select().from(staffUsers)
      .where(and(eq(staffUsers.email, email.trim()), eq(staffUsers.isActive, true))).limit(1);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const [company] = await this.db.select().from(companies).where(eq(companies.id, user.companyId)).limit(1);
    await this.db.update(staffUsers).set({ lastLoginAt: new Date() }).where(eq(staffUsers.id, user.id));

    return {
      token: this.signToken(user, company, 'staff'),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      company: { id: company.id, name: company.name, slug: company.slug },
    };
  }

  async registerClient(data: {
    companySlug: string;
    name: string;
    email: string;
    password: string;
    phone?: string;
    taxId?: string;
    address?: string;
  }) {
    const [company] = await this.db.select().from(companies)
      .where(eq(companies.slug, data.companySlug.trim().toLowerCase())).limit(1);
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const [existing] = await this.db.select({ id: clients.id }).from(clients)
      .where(and(eq(clients.email, data.email.trim()), eq(clients.companyId, company.id))).limit(1);
    if (existing) throw new ConflictException('Email ya registrado');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const code = `CLI-${Date.now().toString(36).toUpperCase()}`;

    const [client] = await this.db.insert(clients).values({
      companyId: company.id,
      code,
      name: data.name.trim(),
      email: data.email.trim(),
      passwordHash,
      phone: data.phone?.trim(),
      taxId: data.taxId?.trim(),
      address: data.address?.trim(),
      status: 'pending',
    }).returning();

    return {
      message: 'Registro enviado. Un administrador activará su cuenta.',
      client: { id: client.id, code: client.code, name: client.name, email: client.email, status: client.status },
    };
  }

  async loginClient(email: string, password: string, companySlug?: string) {
    let clientQuery = this.db.select().from(clients)
      .where(and(eq(clients.email, email.trim()), eq(clients.status, 'active')));

    const rows = await clientQuery.limit(10);
    let client = rows[0];

    if (companySlug) {
      const [company] = await this.db.select().from(companies)
        .where(eq(companies.slug, companySlug.trim().toLowerCase())).limit(1);
      client = rows.find((c: any) => c.companyId === company?.id);
    }

    if (!client?.passwordHash || !(await bcrypt.compare(password, client.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const [company] = await this.db.select().from(companies).where(eq(companies.id, client.companyId)).limit(1);
    await this.db.update(clients).set({ lastLoginAt: new Date() }).where(eq(clients.id, client.id));

    return {
      token: this.signToken(client, company, 'client'),
      client: { id: client.id, code: client.code, name: client.name, email: client.email },
      company: { id: company.id, name: company.name, slug: company.slug },
    };
  }

  private signToken(entity: any, company: any, type: 'staff' | 'client') {
    return this.jwtService.sign({
      sub: entity.id,
      companyId: company.id,
      email: entity.email,
      role: type === 'staff' ? entity.role : 'client',
      name: entity.name,
      type,
      companyName: company.name,
    });
  }

  async validateJwt(payload: any): Promise<AuthUser> {
    if (payload.type === 'client') {
      const [client] = await this.db.select().from(clients).where(eq(clients.id, payload.sub)).limit(1);
      if (!client || client.status !== 'active') throw new UnauthorizedException('Cliente inactivo');
      return {
        userId: client.id,
        companyId: client.companyId,
        email: client.email,
        name: client.name,
        role: 'client',
        type: 'client',
      };
    }

    const [user] = await this.db.select().from(staffUsers).where(eq(staffUsers.id, payload.sub)).limit(1);
    if (!user?.isActive) throw new UnauthorizedException('Usuario inactivo');
    return {
      userId: user.id,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      role: user.role,
      type: 'staff',
    };
  }
}
