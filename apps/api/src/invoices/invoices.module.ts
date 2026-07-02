import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService, DispatchesService } from './invoices.service';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, DispatchesService],
  exports: [InvoicesService, DispatchesService],
})
export class InvoicesModule {}
