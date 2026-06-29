import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import { WebhookDispatcherService } from '../common/services/webhook-dispatcher.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'catalog-render' })],
  controllers: [CatalogsController],
  providers: [CatalogsService, WebhookDispatcherService],
  exports: [CatalogsService],
})
export class CatalogsModule {}
