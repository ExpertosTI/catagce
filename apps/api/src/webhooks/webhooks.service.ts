import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { webhooks, webhookDeliveries } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';

@Injectable()
export class WebhooksService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async findAll(sellerId: string) {
    return this.db.query.webhooks.findMany({
      where: eq(webhooks.sellerId, sellerId),
    });
  }

  async create(sellerId: string, data: { url: string; events: string[] }) {
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    const [hook] = await this.db
      .insert(webhooks)
      .values({ sellerId, url: data.url, events: data.events, secret })
      .returning();
    return hook;
  }

  async update(id: string, sellerId: string, data: Partial<{ url: string; events: string[]; isActive: boolean }>) {
    const [hook] = await this.db
      .update(webhooks)
      .set(data)
      .where(and(eq(webhooks.id, id), eq(webhooks.sellerId, sellerId)))
      .returning();
    if (!hook) throw new NotFoundException('Webhook no encontrado');
    return hook;
  }

  async delete(id: string, sellerId: string) {
    await this.db.delete(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.sellerId, sellerId)));
    return { success: true };
  }

  async getDeliveries(id: string, sellerId: string) {
    const hook = await this.db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, id), eq(webhooks.sellerId, sellerId)),
    });
    if (!hook) throw new NotFoundException('Webhook no encontrado');

    return this.db.query.webhookDeliveries.findMany({
      where: eq(webhookDeliveries.webhookId, id),
      limit: 50,
    });
  }
}
