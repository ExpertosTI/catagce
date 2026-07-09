import { Module } from '@nestjs/common';
import { BroadcastController } from './broadcast.controller';
import { BroadcastService } from './broadcast.service';
import { BroadcastQueueService } from './broadcast-queue.service';
import { BroadcastWorkerService } from './broadcast-worker.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsAppModule],
  controllers: [BroadcastController],
  providers: [BroadcastService, BroadcastQueueService, BroadcastWorkerService],
  exports: [BroadcastService],
})
export class BroadcastModule {}
