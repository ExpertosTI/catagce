import { Module, forwardRef } from '@nestjs/common';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService, PresalesService } from './catalogs.service';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [forwardRef(() => InvoicesModule)],
  controllers: [CatalogsController],
  providers: [CatalogsService, PresalesService],
  exports: [CatalogsService, PresalesService],
})
export class CatalogsModule {}
