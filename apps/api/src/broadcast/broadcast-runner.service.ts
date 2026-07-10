import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { broadcastCampaigns, broadcastJobs, sellerSettings } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { parseMediaUrls } from './media-urls.util';
import { EvolutionCreds, platformEvolution } from '../whatsapp/evolution-config';

@Injectable()
export class BroadcastRunnerService implements OnModuleInit {
  private ticking = false;

  constructor(
    @Inject(DRIZZLE) private db: any,
    private whatsapp: WhatsAppService,
  ) {}

  onModuleInit() {
    setInterval(() => void this.processDueJobs(), 8000);
  }

  private async sellerCreds(sellerId: string): Promise<EvolutionCreds | null> {
    const settings = await this.db.query.sellerSettings.findFirst({
      where: eq(sellerSettings.sellerId, sellerId),
    });
    if (settings?.evolutionInstance && settings?.evolutionToken) {
      return { instance: settings.evolutionInstance, apiKey: settings.evolutionToken };
    }
    return platformEvolution();
  }

  async processDueJobs() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const pending = await this.db.query.broadcastJobs.findMany({
        where: eq(broadcastJobs.status, 'pending'),
        with: { campaign: true },
      });

      const now = Date.now();
      for (const job of pending) {
        const campaign = job.campaign;
        if (!campaign || campaign.status !== 'running') continue;
        const scheduled = job.scheduledAt ? new Date(job.scheduledAt).getTime() : 0;
        if (scheduled > now) continue;
        await this.sendJob(job.id, job.phone, campaign);
      }
    } catch (err) {
      console.warn('[broadcast] tick error', err);
    } finally {
      this.ticking = false;
    }
  }

  private async sendJob(
    jobId: string,
    phone: string,
    campaign: { id: string; sellerId: string; messageText: string; mediaUrl?: string | null },
  ) {
    const mediaUrls = parseMediaUrls(campaign.mediaUrl);
    const creds = await this.sellerCreds(campaign.sellerId);
    const result = await this.whatsapp.sendBundle(phone, {
      text: campaign.messageText,
      mediaUrls,
    }, creds);

    if (result.ok) {
      await this.db.update(broadcastJobs).set({
        status: 'sent',
        sentAt: new Date(),
        error: null,
      }).where(eq(broadcastJobs.id, jobId));
    } else {
      const errMsg = [result.error, result.detail].filter(Boolean).join(': ');
      await this.db.update(broadcastJobs).set({
        status: 'failed',
        error: errMsg.slice(0, 500),
      }).where(eq(broadcastJobs.id, jobId));
      console.warn('[broadcast] send failed', phone, errMsg);
    }

    await this.maybeCompleteCampaign(campaign.id);
  }

  private async maybeCompleteCampaign(campaignId: string) {
    const jobs = await this.db.query.broadcastJobs.findMany({
      where: eq(broadcastJobs.campaignId, campaignId),
    });
    const hasPending = jobs.some((j: { status: string }) => j.status === 'pending');
    if (!hasPending) {
      await this.db.update(broadcastCampaigns).set({
        status: 'completed',
        completedAt: new Date(),
      }).where(eq(broadcastCampaigns.id, campaignId));
    }
  }
}
