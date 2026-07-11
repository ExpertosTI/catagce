import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import { WebhookDispatcherService } from '../common/services/webhook-dispatcher.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'catalog-render' }), WhatsAppModule, PlansModule],
  controllers: [CatalogsController],
  providers: [CatalogsService, WebhookDispatcherService],
  exports: [CatalogsService],
})
export class CatalogsModule {}
