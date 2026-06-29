import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { auditLogs } from '@catagce/db';
import { DRIZZLE } from '../../database/database.module';

@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async log(params: {
    sellerId: string;
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    await this.db.insert(auditLogs).values(params);
  }

  async findBySeller(sellerId: string, limit = 50) {
    return this.db.query.auditLogs.findMany({
      where: eq(auditLogs.sellerId, sellerId),
      limit,
    });
  }
}
