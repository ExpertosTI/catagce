import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { clients } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';

@Injectable()
export class ClientsService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async list(user: AuthUser) {
    return this.db.select().from(clients)
      .where(eq(clients.companyId, user.companyId))
      .orderBy(desc(clients.createdAt));
  }

  async getById(user: AuthUser, id: string) {
    const [client] = await this.db.select().from(clients)
      .where(and(eq(clients.id, id), eq(clients.companyId, user.companyId))).limit(1);
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  async updateStatus(user: AuthUser, id: string, status: 'pending' | 'active' | 'suspended') {
    await this.getById(user, id);
    const [updated] = await this.db.update(clients).set({ status, updatedAt: new Date() })
      .where(eq(clients.id, id)).returning();
    return updated;
  }

  async create(user: AuthUser, data: {
    name: string; email: string; phone?: string; taxId?: string;
    address?: string; creditLimit?: number; creditDays?: number;
  }) {
    const code = `CLI-${Date.now().toString(36).toUpperCase()}`;
    const [client] = await this.db.insert(clients).values({
      companyId: user.companyId,
      code,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone,
      taxId: data.taxId,
      address: data.address,
      creditLimit: data.creditLimit?.toFixed(2) ?? '0',
      creditDays: data.creditDays ?? 30,
      status: 'active',
    }).returning();
    return client;
  }
}
