import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  broadcastCampaigns, broadcastJobs, broadcastListMembers, broadcastLists, sellerSettings,
} from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { normalizePhoneDigits, isValidPhone } from '../common/utils/phone.util';
import { BroadcastRunnerService } from './broadcast-runner.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { parseMediaUrls, serializeMediaUrls } from './media-urls.util';
import { clampInt } from '../common/security/security.util';

const MAX_LIST_MEMBERS_CAMPAIGN = 500;
const DELAY_MIN_FLOOR = 45;
const DELAY_MAX_CEIL = 300;

function randDelay(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function normalizeDelays(minSec?: number, maxSec?: number) {
  const min = clampInt(minSec, DELAY_MIN_FLOOR, DELAY_MAX_CEIL, 45);
  let max = clampInt(maxSec, DELAY_MIN_FLOOR, DELAY_MAX_CEIL, 90);
  if (max < min) max = min;
  return { min, max };
}

@Injectable()
export class BroadcastService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private runner: BroadcastRunnerService,
    private whatsapp: WhatsAppService,
  ) {}

  async listLists(sellerId: string) {
    return this.db.query.broadcastLists.findMany({
      where: eq(broadcastLists.sellerId, sellerId),
      with: { members: true },
    });
  }

  async createList(sellerId: string, body: { name: string; description?: string }) {
    const [list] = await this.db.insert(broadcastLists).values({
      sellerId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
    }).returning();
    return list;
  }

  async addMembers(listId: string, sellerId: string, members: Array<{ phone: string; name: string; buyerContactId?: string }>) {
    const list = await this.db.query.broadcastLists.findFirst({
      where: and(eq(broadcastLists.id, listId), eq(broadcastLists.sellerId, sellerId)),
    });
    if (!list) throw new NotFoundException('Lista no encontrada');

    const inserted = [];
    const skipped: string[] = [];
    for (const m of members) {
      const phone = normalizePhoneDigits(m.phone);
      if (!isValidPhone(phone)) {
        skipped.push(m.phone || m.name || 'sin número');
        continue;
      }
      const exists = await this.db.query.broadcastListMembers.findFirst({
        where: and(eq(broadcastListMembers.listId, listId), eq(broadcastListMembers.phone, phone)),
      });
      if (exists) continue;
      const [row] = await this.db.insert(broadcastListMembers).values({
        listId,
        phone,
        name: (m.name || '').trim() || phone,
        buyerContactId: m.buyerContactId || null,
      }).returning();
      inserted.push(row);
    }
    if (!inserted.length && members.length) {
      throw new BadRequestException(
        skipped.length
          ? `Ningún número válido (RD: 809/829/849). Revisa: ${skipped.slice(0, 3).join(', ')}`
          : 'Esos contactos ya están en la lista',
      );
    }
    return { added: inserted, count: inserted.length, skipped: skipped.length };
  }

  async removeMember(listId: string, sellerId: string, memberId: string) {
    const list = await this.db.query.broadcastLists.findFirst({
      where: and(eq(broadcastLists.id, listId), eq(broadcastLists.sellerId, sellerId)),
    });
    if (!list) throw new NotFoundException('Lista no encontrada');
    await this.db.delete(broadcastListMembers).where(
      and(eq(broadcastListMembers.id, memberId), eq(broadcastListMembers.listId, listId)),
    );
    return { ok: true };
  }

  async listCampaigns(sellerId: string) {
    const campaigns = await this.db.query.broadcastCampaigns.findMany({
      where: eq(broadcastCampaigns.sellerId, sellerId),
      with: { list: true, jobs: true },
    });
    return campaigns.map((c: any) => ({
      ...c,
      mediaUrls: parseMediaUrls(c.mediaUrl),
      stats: this.jobStats(c.jobs || []),
    }));
  }

  private jobStats(jobs: Array<{ status: string }>) {
    return {
      total: jobs.length,
      sent: jobs.filter((j) => j.status === 'sent').length,
      pending: jobs.filter((j) => j.status === 'pending').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
    };
  }

  async createCampaign(sellerId: string, body: {
    listId: string;
    name: string;
    messageText: string;
    mediaUrl?: string;
    mediaUrls?: string[];
    delayMinSec?: number;
    delayMaxSec?: number;
  }) {
    const list = await this.db.query.broadcastLists.findFirst({
      where: and(eq(broadcastLists.id, body.listId), eq(broadcastLists.sellerId, sellerId)),
      with: { members: true },
    });
    if (!list) throw new NotFoundException('Lista no encontrada');
    if (!list.members?.length) throw new BadRequestException('La lista no tiene contactos');
    if (list.members.length > MAX_LIST_MEMBERS_CAMPAIGN) {
      throw new BadRequestException(`Máximo ${MAX_LIST_MEMBERS_CAMPAIGN} contactos por campaña`);
    }

    const urls = body.mediaUrls?.length
      ? body.mediaUrls.slice(0, 8)
      : (body.mediaUrl ? [body.mediaUrl] : []);

    const { min, max } = normalizeDelays(body.delayMinSec, body.delayMaxSec);

    const [campaign] = await this.db.insert(broadcastCampaigns).values({
      sellerId,
      listId: body.listId,
      name: body.name.trim().slice(0, 120),
      messageText: body.messageText.trim().slice(0, 4000),
      mediaUrl: serializeMediaUrls(urls),
      delayMinSec: min,
      delayMaxSec: max,
      status: 'draft',
    }).returning();

    return campaign;
  }

  async getCampaign(sellerId: string, id: string) {
    const campaign = await this.db.query.broadcastCampaigns.findFirst({
      where: and(eq(broadcastCampaigns.id, id), eq(broadcastCampaigns.sellerId, sellerId)),
      with: { list: { with: { members: true } }, jobs: true },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');
    return {
      ...campaign,
      mediaUrls: parseMediaUrls(campaign.mediaUrl),
      stats: this.jobStats(campaign.jobs || []),
    };
  }

  async updateCampaign(sellerId: string, id: string, body: {
    listId?: string;
    name?: string;
    messageText?: string;
    mediaUrl?: string;
    mediaUrls?: string[];
    delayMinSec?: number;
    delayMaxSec?: number;
  }) {
    const campaign = await this.getCampaign(sellerId, id);
    if (campaign.status === 'running') {
      throw new BadRequestException('Pausa la campaña antes de editarla');
    }

    const listId = body.listId ?? campaign.listId;
    if (body.listId && body.listId !== campaign.listId) {
      const list = await this.db.query.broadcastLists.findFirst({
        where: and(eq(broadcastLists.id, body.listId), eq(broadcastLists.sellerId, sellerId)),
        with: { members: true },
      });
      if (!list) throw new NotFoundException('Lista no encontrada');
      if (!list.members?.length) throw new BadRequestException('La lista no tiene contactos');
    }

    const urls = body.mediaUrls
      ? body.mediaUrls
      : (body.mediaUrl !== undefined
        ? (body.mediaUrl ? [body.mediaUrl] : [])
        : parseMediaUrls(campaign.mediaUrl));

    await this.db.update(broadcastCampaigns).set({
      listId,
      name: (body.name?.trim() || campaign.name).slice(0, 120),
      messageText: (body.messageText?.trim() || campaign.messageText).slice(0, 4000),
      mediaUrl: serializeMediaUrls(urls.slice(0, 8)),
      delayMinSec: normalizeDelays(body.delayMinSec ?? campaign.delayMinSec, body.delayMaxSec ?? campaign.delayMaxSec).min,
      delayMaxSec: normalizeDelays(body.delayMinSec ?? campaign.delayMinSec, body.delayMaxSec ?? campaign.delayMaxSec).max,
    }).where(and(eq(broadcastCampaigns.id, id), eq(broadcastCampaigns.sellerId, sellerId)));

    return this.getCampaign(sellerId, id);
  }

  async duplicateCampaign(sellerId: string, id: string) {
    const source = await this.getCampaign(sellerId, id);
    const baseName = String(source.name || 'Campaña').replace(/\s*\(copia(?:\s*\d+)?\)\s*$/i, '').trim();
    const copyName = `${baseName} (copia)`;

    const [campaign] = await this.db.insert(broadcastCampaigns).values({
      sellerId,
      listId: source.listId,
      name: copyName,
      messageText: source.messageText,
      mediaUrl: source.mediaUrl,
      delayMinSec: source.delayMinSec ?? 45,
      delayMaxSec: source.delayMaxSec ?? 90,
      status: 'draft',
    }).returning();

    return this.getCampaign(sellerId, campaign.id);
  }

  async startCampaign(sellerId: string, id: string) {
    const campaign = await this.getCampaign(sellerId, id);
    if (campaign.status === 'running') return campaign;
    const members = campaign.list?.members || [];
    if (!members.length) throw new BadRequestException('Lista vacía');
    if (members.length > MAX_LIST_MEMBERS_CAMPAIGN) {
      throw new BadRequestException(`Máximo ${MAX_LIST_MEMBERS_CAMPAIGN} contactos por campaña`);
    }

    if (!this.whatsapp.adminConfigured()) {
      throw new BadRequestException('WhatsApp no está configurado en el servidor');
    }

    const settings = await this.db.query.sellerSettings.findFirst({
      where: eq(sellerSettings.sellerId, sellerId),
    });
    if (!settings?.evolutionInstance || !settings?.evolutionToken) {
      throw new BadRequestException('Conecta tu WhatsApp en Configuración → WhatsApp antes de difundir');
    }

    await this.db.delete(broadcastJobs).where(eq(broadcastJobs.campaignId, id));

    const { min, max } = normalizeDelays(campaign.delayMinSec, campaign.delayMaxSec);
    let cumulativeDelayMs = 0;

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      if (i > 0) cumulativeDelayMs += randDelay(min, max) * 1000;
      const scheduledAt = new Date(Date.now() + cumulativeDelayMs);

      await this.db.insert(broadcastJobs).values({
        campaignId: id,
        phone: member.phone,
        contactName: member.name,
        status: 'pending',
        scheduledAt,
      });
    }

    await this.db.update(broadcastCampaigns).set({
      status: 'running',
      startedAt: new Date(),
      completedAt: null,
    }).where(eq(broadcastCampaigns.id, id));

    void this.runner.processDueJobs();

    return this.getCampaign(sellerId, id);
  }

  async pauseCampaign(sellerId: string, id: string) {
    await this.db.update(broadcastCampaigns).set({ status: 'paused' })
      .where(and(eq(broadcastCampaigns.id, id), eq(broadcastCampaigns.sellerId, sellerId)));
    return this.getCampaign(sellerId, id);
  }

  async retryFailed(sellerId: string, id: string) {
    const campaign = await this.getCampaign(sellerId, id);
    const failed = (campaign.jobs || []).filter((j: { status: string }) => j.status === 'failed');
    if (!failed.length) throw new BadRequestException('No hay envíos fallidos');

    const { min, max } = normalizeDelays(campaign.delayMinSec, campaign.delayMaxSec);
    let cumulativeDelayMs = 0;

    for (let i = 0; i < failed.length; i++) {
      if (i > 0) cumulativeDelayMs += randDelay(min, max) * 1000;
      await this.db.update(broadcastJobs).set({
        status: 'pending',
        error: null,
        scheduledAt: new Date(Date.now() + cumulativeDelayMs),
      }).where(eq(broadcastJobs.id, failed[i].id));
    }

    await this.db.update(broadcastCampaigns).set({
      status: 'running',
      completedAt: null,
    }).where(eq(broadcastCampaigns.id, id));

    void this.runner.processDueJobs();
    return this.getCampaign(sellerId, id);
  }

  async deleteCampaign(sellerId: string, id: string) {
    const campaign = await this.db.query.broadcastCampaigns.findFirst({
      where: and(eq(broadcastCampaigns.id, id), eq(broadcastCampaigns.sellerId, sellerId)),
      columns: { id: true },
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    await this.db.delete(broadcastJobs).where(eq(broadcastJobs.campaignId, id));
    await this.db.delete(broadcastCampaigns).where(
      and(eq(broadcastCampaigns.id, id), eq(broadcastCampaigns.sellerId, sellerId)),
    );

    return { ok: true, id };
  }
}
