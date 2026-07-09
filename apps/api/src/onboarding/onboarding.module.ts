import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingChatService } from './onboarding-chat.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [OnboardingController],
  providers: [OnboardingChatService],
})
export class OnboardingModule {}
