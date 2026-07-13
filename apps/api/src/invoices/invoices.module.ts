import { Module, forwardRef } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService, DispatchesService } from './invoices.service';
import { FiscalModule } from '../fiscal/fiscal.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [FiscalModule, forwardRef(() => WhatsAppModule)],
  controllers: [InvoicesController],
  providers: [InvoicesService, DispatchesService],
  exports: [InvoicesService, DispatchesService],
})
export class InvoicesModule {}
