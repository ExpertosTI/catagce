import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { buyerContacts, whatsappTickets } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { isValidPhone, normalizePhoneDigits } from '../common/utils/phone.util';

@Injectable()
export class ContactsService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  private contactSource(row: { orderCount?: number | null; lastOrderAt?: Date | null }) {
    if ((row.orderCount ?? 0) > 0 || row.lastOrderAt) return 'cliente';
    return 'manual';
  }

  async listForSeller(sellerId: string) {
    const [buyers, tickets] = await Promise.all([
      this.db.query.buyerContacts.findMany({ where: eq(buyerContacts.sellerId, sellerId) }),
      this.db.query.whatsappTickets.findMany({ where: eq(whatsappTickets.sellerId, sellerId) }),
    ]);

    const map = new Map<string, {
      id: string; name: string; phone: string; source: string; canDelete: boolean; email?: string;
    }>();

    for (const b of buyers) {
      const phone = normalizePhoneDigits(b.phone);
      if (!phone) continue;
      map.set(phone, {
        id: b.id,
        name: b.name,
        phone,
        email: b.email || undefined,
        source: this.contactSource(b),
        canDelete: true,
      });
    }

    for (const t of tickets) {
      const phone = normalizePhoneDigits(t.phone);
      if (!phone || map.has(phone)) continue;
      map.set(phone, {
        id: t.id,
        name: t.contactName || phone,
        phone,
        source: 'whatsapp',
        canDelete: false,
      });
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async listManaged(sellerId: string) {
    const rows = await this.db.query.buyerContacts.findMany({
      where: eq(buyerContacts.sellerId, sellerId),
    });
    return rows
      .map((b: any) => {
        const phone = normalizePhoneDigits(b.phone);
        return {
          id: b.id,
          name: b.name,
          phone,
          email: b.email || undefined,
          source: this.contactSource(b),
          orderCount: b.orderCount ?? 0,
        };
      })
      .filter((c: { phone: string }) => c.phone)
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
  }

  async create(sellerId: string, body: { name: string; phone: string; email?: string }) {
    const phone = normalizePhoneDigits(body.phone);
    if (!isValidPhone(phone)) throw new BadRequestException('Número de WhatsApp inválido');

    const all = await this.db.query.buyerContacts.findMany({
      where: eq(buyerContacts.sellerId, sellerId),
    });
    if (all.some((c: { phone: string }) => normalizePhoneDigits(c.phone) === phone)) {
      throw new ConflictException('Ya existe un contacto con ese número');
    }

    const [contact] = await this.db.insert(buyerContacts).values({
      sellerId,
      name: body.name.trim(),
      phone,
      email: body.email?.trim() || null,
      orderCount: 0,
    }).returning();

    return {
      id: contact.id,
      name: contact.name,
      phone: normalizePhoneDigits(contact.phone),
      email: contact.email || undefined,
      source: 'manual',
      orderCount: 0,
    };
  }

  async delete(sellerId: string, id: string) {
    const [deleted] = await this.db.delete(buyerContacts)
      .where(and(eq(buyerContacts.id, id), eq(buyerContacts.sellerId, sellerId)))
      .returning();
    if (!deleted) throw new NotFoundException('Contacto no encontrado');
    return { ok: true };
  }
}
