import { Module } from '@nestjs/common';
import { MetaWebhookController } from './meta-webhook.controller';
import { MetaWebhookService } from './meta-webhook.service';

@Module({
  controllers: [MetaWebhookController],
  providers: [MetaWebhookService],
})
export class MetaWebhookModule {}
