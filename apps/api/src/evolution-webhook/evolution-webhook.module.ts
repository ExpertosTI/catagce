import { Module } from '@nestjs/common';
import { EvolutionWebhookController } from './evolution-webhook.controller';
import { EvolutionWebhookService } from './evolution-webhook.service';
import { OrderSyncModule } from '../order-sync/order-sync.module';

@Module({
  imports: [OrderSyncModule],
  controllers: [EvolutionWebhookController],
  providers: [EvolutionWebhookService],
})
export class EvolutionWebhookModule {}
