import { Module } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { InventoryBroadcastService } from './inventory-broadcast.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MobileController],
  providers: [MobileService, InventoryBroadcastService],
  exports: [MobileService, InventoryBroadcastService],
})
export class MobileModule {}
