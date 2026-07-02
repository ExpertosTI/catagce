import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { companies } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';

@Injectable()
export class CompaniesService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async getMine(user: AuthUser) {
    const [company] = await this.db.select().from(companies)
      .where(eq(companies.id, user.companyId)).limit(1);
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return company;
  }

  async update(user: AuthUser, data: {
    name?: string; taxId?: string; email?: string; phone?: string;
    address?: string; logoUrl?: string;
    settings?: Record<string, unknown>;
  }) {
    const [current] = await this.db.select().from(companies)
      .where(eq(companies.id, user.companyId)).limit(1);
    if (!current) throw new NotFoundException('Empresa no encontrada');

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.taxId !== undefined) updates.taxId = data.taxId;
    if (data.email !== undefined) updates.email = data.email;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.address !== undefined) updates.address = data.address;
    if (data.logoUrl !== undefined) updates.logoUrl = data.logoUrl;
    if (data.settings !== undefined) {
      updates.settings = { ...(current.settings as object ?? {}), ...data.settings };
    }

    const [updated] = await this.db.update(companies).set(updates)
      .where(eq(companies.id, user.companyId)).returning();
    return updated;
  }
}
