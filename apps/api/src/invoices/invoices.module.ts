import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService, DispatchesService } from './invoices.service';
import { FiscalModule } from '../fiscal/fiscal.module';

@Module({
  imports: [FiscalModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, DispatchesService],
  exports: [InvoicesService, DispatchesService],
})
export class InvoicesModule {}
