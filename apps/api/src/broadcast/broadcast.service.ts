import {
  Injectable, Inject, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import {
  broadcastContacts, broadcastLists, broadcastListMembers,
  broadcastCampaigns, broadcastCampaignJobs, clients,
} from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';
import { isValidPhone, normalizePhoneDigits } from '../whatsapp/phone.util';
import { BroadcastQueueService } from './broadcast-queue.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class BroadcastService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private queue: BroadcastQueueService,
    private whatsApp: WhatsAppService,
  ) {}

  status() {
    const { whatsapp, ready } = this.whatsApp.status();
    return { whatsapp, ready };
  }

  async listContacts(user: AuthUser) {
    return this.db.select().from(broadcastContacts)
      .where(eq(broadcastContacts.companyId, user.companyId))
      .orderBy(asc(broadcastContacts.name));
  }

  async createContact(user: AuthUser, data: { name: string; phone: string; notes?: string }) {
    const name = data.name?.trim();
    const phone = normalizePhoneDigits(data.phone || '');
    if (!name) throw new BadRequestException('El nombre es obligatorio');
    if (!isValidPhone(phone)) throw new BadRequestException('Teléfono inválido');

    try {
      const [row] = await this.db.insert(broadcastContacts).values({
        companyId: user.companyId,
        name,
        phone,
        notes: data.notes?.trim() || null,
      }).returning();
      return row;
    } catch {
      throw new ConflictException('Ya existe un contacto con ese teléfono');
    }
  }

  async importFromClients(user: AuthUser) {
    const rows = await this.db.select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
    })
      .from(clients)
      .where(and(
        eq(clients.companyId, user.companyId),
        sql`${clients.phone} IS NOT NULL AND ${clients.phone} != ''`,
      ));

    let imported = 0;
    for (const c of rows) {
      const phone = normalizePhoneDigits(c.phone || '');
      if (!isValidPhone(phone)) continue;
      try {
        await this.db.insert(broadcastContacts).values({
          companyId: user.companyId,
          name: c.name,
          phone,
          clientId: c.id,
        }).onConflictDoNothing();
        imported += 1;
      } catch {
        // skip duplicates
      }
    }
    return { imported };
  }

  async listLists(user: AuthUser) {
    const lists = await this.db.select().from(broadcastLists)
      .where(eq(broadcastLists.companyId, user.companyId))
      .orderBy(desc(broadcastLists.createdAt));

    const result = [];
    for (const l of lists) {
      const [{ count }] = await this.db.select({ count: sql<number>`count(*)::int` })
        .from(broadcastListMembers)
        .where(eq(broadcastListMembers.listId, l.id));
      result.push({ ...l, memberCount: count });
    }
    return result;
  }

  async createList(user: AuthUser, data: { name: string; color?: string; contactIds: string[] }) {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('El nombre es obligatorio');
    if (!data.contactIds?.length) throw new BadRequestException('Seleccione al menos un contacto');

    const [list] = await this.db.insert(broadcastLists).values({
      companyId: user.companyId,
      name,
      color: data.color || '#25D366',
    }).returning();

    for (const contactId of data.contactIds) {
      const [contact] = await this.db.select().from(broadcastContacts)
        .where(and(
          eq(broadcastContacts.id, contactId),
          eq(broadcastContacts.companyId, user.companyId),
        )).limit(1);
      if (contact) {
        await this.db.insert(broadcastListMembers).values({
          listId: list.id,
          contactId: contact.id,
        }).onConflictDoNothing();
      }
    }
    return list;
  }

  async listCampaigns(user: AuthUser) {
    const rows = await this.db.select({
      campaign: broadcastCampaigns,
      listName: broadcastLists.name,
    })
      .from(broadcastCampaigns)
      .innerJoin(broadcastLists, eq(broadcastCampaigns.listId, broadcastLists.id))
      .where(eq(broadcastCampaigns.companyId, user.companyId))
      .orderBy(desc(broadcastCampaigns.createdAt));

    return Promise.all(rows.map(async (row: { campaign: typeof broadcastCampaigns.$inferSelect; listName: string }) => ({
      ...row.campaign,
      listName: row.listName,
      stats: await this.queue.campaignStats(row.campaign.id),
    })));
  }

  async createCampaign(user: AuthUser, data: {
    name: string;
    listId: string;
    message: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
    intervalMinSec?: number;
    intervalMaxSec?: number;
    startAt?: string | null;
  }) {
    const name = data.name?.trim();
    const message = data.message?.trim();
    if (!name || !data.listId || !message) {
      throw new BadRequestException('Nombre, lista y mensaje son obligatorios');
    }

    const [list] = await this.db.select().from(broadcastLists)
      .where(and(eq(broadcastLists.id, data.listId), eq(broadcastLists.companyId, user.companyId)))
      .limit(1);
    if (!list) throw new NotFoundException('Lista no encontrada');

    const intervalMin = Math.max(15, Number(data.intervalMinSec) || 45);
    const intervalMax = Math.max(intervalMin, Number(data.intervalMaxSec) || 90);

    const [campaign] = await this.db.insert(broadcastCampaigns).values({
      companyId: user.companyId,
      listId: data.listId,
      name,
      message,
      mediaUrl: data.mediaUrl?.trim() || null,
      mediaType: data.mediaType || null,
      intervalMinSec: intervalMin,
      intervalMaxSec: intervalMax,
      startAt: data.startAt ? new Date(data.startAt) : null,
      status: 'draft',
    }).returning();

    return campaign;
  }

  async getCampaign(user: AuthUser, id: string) {
    const [row] = await this.db.select({
      campaign: broadcastCampaigns,
      listName: broadcastLists.name,
    })
      .from(broadcastCampaigns)
      .innerJoin(broadcastLists, eq(broadcastCampaigns.listId, broadcastLists.id))
      .where(and(
        eq(broadcastCampaigns.id, id),
        eq(broadcastCampaigns.companyId, user.companyId),
      )).limit(1);

    if (!row) throw new NotFoundException('Campaña no encontrada');

    const jobs = await this.db.select().from(broadcastCampaignJobs)
      .where(eq(broadcastCampaignJobs.campaignId, id))
      .orderBy(asc(broadcastCampaignJobs.scheduledAt));

    return {
      campaign: { ...row.campaign, listName: row.listName },
      jobs,
      stats: await this.queue.campaignStats(id),
    };
  }

  async startCampaign(user: AuthUser, id: string) {
    await this.getCampaign(user, id);
    await this.queue.enqueueCampaign(user.companyId, id);
    return this.getCampaign(user, id);
  }

  async updateCampaignStatus(user: AuthUser, id: string, action: 'pause' | 'resume') {
    const { campaign } = await this.getCampaign(user, id);
    if (action === 'pause' && campaign.status === 'running') {
      await this.db.update(broadcastCampaigns)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(eq(broadcastCampaigns.id, id));
    } else if (action === 'resume' && campaign.status === 'paused') {
      await this.db.update(broadcastCampaigns)
        .set({ status: 'running', updatedAt: new Date() })
        .where(eq(broadcastCampaigns.id, id));
    }
    return this.getCampaign(user, id);
  }
}
