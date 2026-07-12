import { Inject, Injectable } from '@nestjs/common';
import { metaMessageEvents } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';

@Injectable()
export class MetaWebhookService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async handle(body: any) {
    if (body?.object !== 'whatsapp_business_account') {
      return { ok: true, ignored: true };
    }
    const entries = Array.isArray(body.entry) ? body.entry : [];
    let stored = 0;
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        if (change?.field !== 'messages') continue;
        const value = change.value || {};
        const phoneNumberId = value?.metadata?.phone_number_id || null;
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        for (const st of statuses) {
          await this.db.insert(metaMessageEvents).values({
            wamid: String(st.id || ''),
            phoneNumberId,
            status: String(st.status || 'unknown'),
            recipientId: st.recipient_id ? String(st.recipient_id) : null,
            payload: st,
          }).catch(() => null);
          stored += 1;
        }
        const messages = Array.isArray(value.messages) ? value.messages : [];
        for (const msg of messages) {
          await this.db.insert(metaMessageEvents).values({
            wamid: String(msg.id || ''),
            phoneNumberId,
            status: 'inbound',
            recipientId: msg.from ? String(msg.from) : null,
            payload: msg,
          }).catch(() => null);
          stored += 1;
        }
      }
    }
    return { ok: true, stored };
  }
}
