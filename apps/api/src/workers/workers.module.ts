import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsProcessor } from './notifications.processor';
import { MediaProcessor } from './media.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'media' }
    ),
  ],
  providers: [NotificationsProcessor, MediaProcessor],
})
export class WorkersModule {}
