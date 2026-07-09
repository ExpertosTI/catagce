import { Injectable, Inject } from '@nestjs/common';
import { eq, and, lte, asc, sql, inArray } from 'drizzle-orm';
import {
  broadcastCampaigns,
  broadcastCampaignJobs,
  broadcastContacts,
  broadcastListMembers,
  broadcastLists,
} from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

function randomBetween(min: number, max: number) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

@Injectable()
export class BroadcastQueueService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private whatsApp: WhatsAppService,
  ) {}

  async campaignStats(campaignId: string) {
    const rows = await this.db.select({
      status: broadcastCampaignJobs.status,
      n: sql<number>`count(*)::int`,
    })
      .from(broadcastCampaignJobs)
      .where(eq(broadcastCampaignJobs.campaignId, campaignId))
      .groupBy(broadcastCampaignJobs.status);

    const stats = { total: 0, sent: 0, pending: 0, failed: 0 };
    for (const r of rows) {
      stats.total += r.n;
      if (r.status === 'sent') stats.sent = r.n;
      if (r.status === 'pending' || r.status === 'sending') stats.pending += r.n;
      if (r.status === 'failed') stats.failed = r.n;
    }
    return stats;
  }

  async scheduleCampaignJobs(
    campaignId: string,
    startAt: Date,
    intervalMin: number,
    intervalMax: number,
  ) {
    const jobs = await this.db.select({ id: broadcastCampaignJobs.id })
      .from(broadcastCampaignJobs)
      .where(and(
        eq(broadcastCampaignJobs.campaignId, campaignId),
        eq(broadcastCampaignJobs.status, 'pending'),
      ))
      .orderBy(asc(broadcastCampaignJobs.id));

    let cursor = startAt.getTime();
    for (const job of jobs) {
      await this.db.update(broadcastCampaignJobs)
        .set({ scheduledAt: new Date(cursor) })
        .where(eq(broadcastCampaignJobs.id, job.id));
      cursor += randomBetween(intervalMin, intervalMax) * 1000;
    }
  }

  async enqueueCampaign(companyId: string, campaignId: string) {
    const [campaign] = await this.db.select().from(broadcastCampaigns)
      .where(and(
        eq(broadcastCampaigns.id, campaignId),
        eq(broadcastCampaigns.companyId, companyId),
      )).limit(1);
    if (!campaign) throw new Error('campaign_not_found');

    const [list] = await this.db.select().from(broadcastLists)
      .where(and(eq(broadcastLists.id, campaign.listId), eq(broadcastLists.companyId, companyId)))
      .limit(1);
    if (!list) throw new Error('list_not_found');

    await this.db.delete(broadcastCampaignJobs)
      .where(eq(broadcastCampaignJobs.campaignId, campaignId));

    const members = await this.db.select({
      id: broadcastContacts.id,
      name: broadcastContacts.name,
      phone: broadcastContacts.phone,
    })
      .from(broadcastContacts)
      .innerJoin(broadcastListMembers, eq(broadcastListMembers.contactId, broadcastContacts.id))
      .where(eq(broadcastListMembers.listId, campaign.listId))
      .orderBy(asc(broadcastContacts.name));

    const start = campaign.startAt ? new Date(campaign.startAt) : new Date();
    for (const m of members) {
      await this.db.insert(broadcastCampaignJobs).values({
        campaignId,
        contactId: m.id,
        phone: m.phone,
        contactName: m.name,
        status: 'pending',
        scheduledAt: start,
      });
    }

    await this.db.update(broadcastCampaigns)
      .set({ status: 'scheduled', updatedAt: new Date() })
      .where(eq(broadcastCampaigns.id, campaignId));

    await this.scheduleCampaignJobs(
      campaignId,
      start,
      campaign.intervalMinSec,
      campaign.intervalMaxSec,
    );

    await this.db.update(broadcastCampaigns)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(broadcastCampaigns.id, campaignId));
  }

  async processNextJob() {
    if (!this.whatsApp.evolutionConfigured()) {
      return { processed: false, error: 'evolution_not_configured' };
    }

    const now = new Date();
    const [job] = await this.db.select({
      id: broadcastCampaignJobs.id,
      phone: broadcastCampaignJobs.phone,
      message: broadcastCampaigns.message,
      mediaUrl: broadcastCampaigns.mediaUrl,
      mediaType: broadcastCampaigns.mediaType,
    })
      .from(broadcastCampaignJobs)
      .innerJoin(broadcastCampaigns, eq(broadcastCampaignJobs.campaignId, broadcastCampaigns.id))
      .where(and(
        eq(broadcastCampaignJobs.status, 'pending'),
        lte(broadcastCampaignJobs.scheduledAt, now),
        eq(broadcastCampaigns.status, 'running'),
      ))
      .orderBy(asc(broadcastCampaignJobs.scheduledAt))
      .limit(1);

    if (!job) {
      const running = await this.db.select({ id: broadcastCampaigns.id })
        .from(broadcastCampaigns)
        .where(eq(broadcastCampaigns.status, 'running'));

      for (const c of running) {
        const [{ count }] = await this.db.select({ count: sql<number>`count(*)::int` })
          .from(broadcastCampaignJobs)
          .where(and(
            eq(broadcastCampaignJobs.campaignId, c.id),
            inArray(broadcastCampaignJobs.status, ['pending', 'sending']),
          ));
        if (count === 0) {
          await this.db.update(broadcastCampaigns)
            .set({ status: 'completed', updatedAt: new Date() })
            .where(eq(broadcastCampaigns.id, c.id));
        }
      }
      return { processed: false };
    }

    await this.db.update(broadcastCampaignJobs)
      .set({ status: 'sending' })
      .where(eq(broadcastCampaignJobs.id, job.id));

    try {
      const result = job.mediaUrl
        ? await this.whatsApp.sendMedia(job.phone, {
          mediaUrl: job.mediaUrl,
          mediatype: (job.mediaType as 'image' | 'document' | 'video') || 'image',
          caption: job.message,
        })
        : await this.whatsApp.sendText(job.phone, job.message);

      if (!result.ok) throw new Error(result.error || 'send_failed');

      await this.db.update(broadcastCampaignJobs)
        .set({ status: 'sent', sentAt: new Date(), error: null })
        .where(eq(broadcastCampaignJobs.id, job.id));
      return { processed: true, jobId: job.id, ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'send_failed';
      await this.db.update(broadcastCampaignJobs)
        .set({ status: 'failed', error: msg, sentAt: new Date() })
        .where(eq(broadcastCampaignJobs.id, job.id));
      return { processed: true, jobId: job.id, ok: false, error: msg };
    }
  }
}
