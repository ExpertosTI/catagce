import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { broadcastCampaigns, broadcastJobs } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Processor('broadcast')
export class BroadcastProcessor extends WorkerHost {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private whatsapp: WhatsAppService,
  ) {
    super();
  }

  async process(job: Job<{ jobId: string; campaignId: string; phone: string; text: string; mediaUrl?: string }>) {
    const { jobId, campaignId, phone, text, mediaUrl } = job.data;

    const campaign = await this.db.query.broadcastCampaigns.findFirst({
      where: eq(broadcastCampaigns.id, campaignId),
    });
    if (!campaign || campaign.status === 'paused' || campaign.status === 'cancelled') {
      return { skipped: true };
    }

    let result;
    if (mediaUrl) {
      result = await this.whatsapp.sendMedia(phone, { caption: text, mediaUrl });
    } else {
      result = await this.whatsapp.sendText(phone, text);
    }

    if (result.ok) {
      await this.db.update(broadcastJobs).set({
        status: 'sent',
        sentAt: new Date(),
        error: null,
      }).where(eq(broadcastJobs.id, jobId));
    } else {
      await this.db.update(broadcastJobs).set({
        status: 'failed',
        error: result.error || 'send_failed',
      }).where(eq(broadcastJobs.id, jobId));
    }

    await this.maybeCompleteCampaign(campaignId);
    return { ok: result.ok };
  }

  private async maybeCompleteCampaign(campaignId: string) {
    const pending = await this.db.query.broadcastJobs.findMany({
      where: eq(broadcastJobs.campaignId, campaignId),
    });
    const hasPending = pending.some((j: any) => j.status === 'pending');
    if (!hasPending) {
      await this.db.update(broadcastCampaigns).set({
        status: 'completed',
        completedAt: new Date(),
      }).where(eq(broadcastCampaigns.id, campaignId));
    }
  }
}
