import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { BroadcastQueueService } from './broadcast-queue.service';

const TICK_INTERVAL_MS = Number(process.env.BROADCAST_WORKER_INTERVAL_MS || 8000);

@Injectable()
export class BroadcastWorkerService implements OnModuleInit {
  private readonly logger = new Logger(BroadcastWorkerService.name);

  constructor(private queue: BroadcastQueueService) {}

  onModuleInit() {
    setTimeout(() => this.tick().catch((err) => this.logger.error(err)), 10_000);
    setInterval(() => this.tick().catch((err) => this.logger.error(err)), TICK_INTERVAL_MS);
  }

  private async tick() {
    const result = await this.queue.processNextJob();
    if (result.processed && result.ok) {
      this.logger.debug(`Broadcast job ${result.jobId} sent`);
    }
  }
}
