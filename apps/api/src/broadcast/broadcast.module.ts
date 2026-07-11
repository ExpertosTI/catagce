import { Module } from '@nestjs/common';
import { BroadcastController } from './broadcast.controller';
import { BroadcastService } from './broadcast.service';
import { BroadcastRunnerService } from './broadcast-runner.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [WhatsAppModule, PlansModule],
  controllers: [BroadcastController],
  providers: [BroadcastService, BroadcastRunnerService],
})
export class BroadcastModule {}
