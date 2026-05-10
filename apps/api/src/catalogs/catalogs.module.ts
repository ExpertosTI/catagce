import { Module } from '@nestjs/common';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CatalogsController],
  providers: [CatalogsService],
  exports: [CatalogsService],
})
export class CatalogsModule {}
