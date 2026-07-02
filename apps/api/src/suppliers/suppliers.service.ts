import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { suppliers } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';

@Injectable()
export class SuppliersService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async list(user: AuthUser) {
    return this.db.select().from(suppliers)
      .where(eq(suppliers.companyId, user.companyId))
      .orderBy(desc(suppliers.createdAt));
  }

  async create(user: AuthUser, data: {
    name: string; country?: string; contactName?: string; email?: string; phone?: string; notes?: string;
  }) {
    const [supplier] = await this.db.insert(suppliers).values({
      companyId: user.companyId,
      name: data.name.trim(),
      country: data.country,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
    }).returning();
    return supplier;
  }
}
