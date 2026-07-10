import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import {
  broadcastCampaigns, broadcastJobs, broadcastListMembers, broadcastLists,
} from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { normalizePhoneDigits, isValidPhone } from '../common/utils/phone.util';

function randDelay(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

@Injectable()
export class BroadcastService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    @InjectQueue('broadcast') private broadcastQueue: Queue,
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
    for (const m of members) {
      const phone = normalizePhoneDigits(m.phone);
      if (!isValidPhone(phone)) continue;
      const exists = await this.db.query.broadcastListMembers.findFirst({
        where: and(eq(broadcastListMembers.listId, listId), eq(broadcastListMembers.phone, phone)),
      });
      if (exists) continue;
      const [row] = await this.db.insert(broadcastListMembers).values({
        listId,
        phone,
        name: m.name.trim() || phone,
        buyerContactId: m.buyerContactId || null,
      }).returning();
      inserted.push(row);
    }
    return inserted;
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
      stats: {
        total: c.jobs?.length || 0,
        sent: c.jobs?.filter((j: any) => j.status === 'sent').length || 0,
        pending: c.jobs?.filter((j: any) => j.status === 'pending').length || 0,
        failed: c.jobs?.filter((j: any) => j.status === 'failed').length || 0,
      },
    }));
  }

  async createCampaign(sellerId: string, body: {
    listId: string;
    name: string;
    messageText: string;
    mediaUrl?: string;
    delayMinSec?: number;
    delayMaxSec?: number;
  }) {
    const list = await this.db.query.broadcastLists.findFirst({
      where: and(eq(broadcastLists.id, body.listId), eq(broadcastLists.sellerId, sellerId)),
      with: { members: true },
    });
    if (!list) throw new NotFoundException('Lista no encontrada');
    if (!list.members?.length) throw new BadRequestException('La lista no tiene contactos');

    const [campaign] = await this.db.insert(broadcastCampaigns).values({
      sellerId,
      listId: body.listId,
      name: body.name.trim(),
      messageText: body.messageText.trim(),
      mediaUrl: body.mediaUrl?.trim() || null,
      delayMinSec: body.delayMinSec ?? 45,
      delayMaxSec: body.delayMaxSec ?? 90,
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
    const jobs = campaign.jobs || [];
    return {
      ...campaign,
      stats: {
        total: jobs.length,
        sent: jobs.filter((j: any) => j.status === 'sent').length,
        pending: jobs.filter((j: any) => j.status === 'pending').length,
        failed: jobs.filter((j: any) => j.status === 'failed').length,
      },
    };
  }

  async startCampaign(sellerId: string, id: string) {
    const campaign = await this.getCampaign(sellerId, id);
    if (campaign.status === 'running') return campaign;
    const members = campaign.list?.members || [];
    if (!members.length) throw new BadRequestException('Lista vacía');

    await this.db.delete(broadcastJobs).where(eq(broadcastJobs.campaignId, id));

    const min = campaign.delayMinSec ?? 45;
    const max = campaign.delayMaxSec ?? 90;
    let cumulativeDelayMs = 0;

    for (const member of members) {
      cumulativeDelayMs += randDelay(min, max) * 1000;
      const scheduledAt = new Date(Date.now() + cumulativeDelayMs);

      const [jobRow] = await this.db.insert(broadcastJobs).values({
        campaignId: id,
        phone: member.phone,
        contactName: member.name,
        status: 'pending',
        scheduledAt,
      }).returning();

      await this.broadcastQueue.add(
        'send',
        {
          jobId: jobRow.id,
          campaignId: id,
          phone: member.phone,
          text: campaign.messageText,
          mediaUrl: campaign.mediaUrl || undefined,
        },
        { delay: cumulativeDelayMs, jobId: `broadcast-${jobRow.id}` },
      );
    }

    await this.db.update(broadcastCampaigns).set({
      status: 'running',
      startedAt: new Date(),
      completedAt: null,
    }).where(eq(broadcastCampaigns.id, id));

    return this.getCampaign(sellerId, id);
  }

  async pauseCampaign(sellerId: string, id: string) {
    await this.db.update(broadcastCampaigns).set({ status: 'paused' })
      .where(and(eq(broadcastCampaigns.id, id), eq(broadcastCampaigns.sellerId, sellerId)));
    return this.getCampaign(sellerId, id);
  }
}
