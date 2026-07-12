import { Module } from '@nestjs/common';
import { BroadcastController } from './broadcast.controller';
import { BroadcastService } from './broadcast.service';
import { BroadcastRunnerService } from './broadcast-runner.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { WhatsAppConnectModule } from '../whatsapp-connect/whatsapp-connect.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [WhatsAppModule, WhatsAppConnectModule, PlansModule],
  controllers: [BroadcastController],
  providers: [BroadcastService, BroadcastRunnerService],
})
export class BroadcastModule {}
