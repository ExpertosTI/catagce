import { Module, forwardRef } from '@nestjs/common';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService, PresalesService } from './catalogs.service';
import { InvoicesModule } from '../invoices/invoices.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [forwardRef(() => InvoicesModule), WhatsAppModule],
  controllers: [CatalogsController],
  providers: [CatalogsService, PresalesService],
  exports: [CatalogsService, PresalesService],
})
export class CatalogsModule {}
