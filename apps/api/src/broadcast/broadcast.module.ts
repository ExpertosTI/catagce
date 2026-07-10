import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BroadcastController } from './broadcast.controller';
import { BroadcastService } from './broadcast.service';
import { BroadcastProcessor } from './broadcast.processor';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    WhatsAppModule,
    BullModule.registerQueue({ name: 'broadcast' }),
  ],
  controllers: [BroadcastController],
  providers: [BroadcastService, BroadcastProcessor],
})
export class BroadcastModule {}
