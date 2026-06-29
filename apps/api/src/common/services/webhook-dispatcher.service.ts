import { Injectable, Inject } from '@nestjs/common';
import { createHmac } from 'crypto';
import { eq } from 'drizzle-orm';
import { webhooks, webhookDeliveries } from '@catagce/db';
import { DRIZZLE } from '../../database/database.module';

@Injectable()
export class WebhookDispatcherService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async dispatch(sellerId: string, event: string, payload: Record<string, unknown>) {
    const hooks = await this.db.query.webhooks.findMany({
      where: eq(webhooks.sellerId, sellerId),
    });

    const activeHooks = hooks.filter(
      (h: { isActive: boolean; events: string[] }) =>
        h.isActive && h.events.includes(event),
    );

    await Promise.allSettled(
      activeHooks.map((hook: { id: string; url: string; secret: string | null }) =>
        this.deliver(hook, event, payload),
      ),
    );
  }

  private async deliver(
    hook: { id: string; url: string; secret: string | null },
    event: string,
    payload: Record<string, unknown>,
  ) {
    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Catagce-Event': event,
    };

    if (hook.secret) {
      const signature = createHmac('sha256', hook.secret).update(body).digest('hex');
      headers['X-Catagce-Signature'] = `sha256=${signature}`;
    }

    let statusCode = 0;
    let success = false;

    try {
      const response = await fetch(hook.url, { method: 'POST', headers, body });
      statusCode = response.status;
      success = response.ok;
    } catch {
      success = false;
    }

    await this.db.insert(webhookDeliveries).values({
      webhookId: hook.id,
      event,
      payload,
      statusCode,
      success,
    });
  }
}
