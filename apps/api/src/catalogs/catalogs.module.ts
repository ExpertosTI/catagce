import { Module } from '@nestjs/common';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService, PresalesService } from './catalogs.service';

@Module({
  controllers: [CatalogsController],
  providers: [CatalogsService, PresalesService],
  exports: [CatalogsService, PresalesService],
})
export class CatalogsModule {}
