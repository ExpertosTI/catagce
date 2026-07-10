import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { buyerContacts, whatsappTickets } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { normalizePhoneDigits } from '../common/utils/phone.util';

@Injectable()
export class ContactsService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async listForSeller(sellerId: string) {
    const [buyers, tickets] = await Promise.all([
      this.db.query.buyerContacts.findMany({ where: eq(buyerContacts.sellerId, sellerId) }),
      this.db.query.whatsappTickets.findMany({ where: eq(whatsappTickets.sellerId, sellerId) }),
    ]);

    const map = new Map<string, { id: string; name: string; phone: string; source: string }>();

    for (const b of buyers) {
      const phone = normalizePhoneDigits(b.phone);
      if (!phone) continue;
      map.set(phone, {
        id: b.id,
        name: b.name,
        phone,
        source: 'pedido',
      });
    }

    for (const t of tickets) {
      const phone = normalizePhoneDigits(t.phone);
      if (!phone) continue;
      if (!map.has(phone)) {
        map.set(phone, {
          id: t.id,
          name: t.contactName || phone,
          phone,
          source: 'whatsapp',
        });
      }
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}
