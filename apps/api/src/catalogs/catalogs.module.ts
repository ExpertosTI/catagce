import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'catalog-render' })],
  controllers: [CatalogsController],
  providers: [CatalogsService],
  exports: [CatalogsService],
})
export class CatalogsModule {}
