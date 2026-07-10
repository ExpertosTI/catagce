import { Controller, Get, Post, Body } from '@nestjs/common';
import { OnboardingChatService } from './onboarding-chat.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

@Controller('onboarding')
export class OnboardingController {
  constructor(private chat: OnboardingChatService) {}

  @Get('chat')
  async initial(@CurrentUser() user: UserPayload) {
    return this.chat.initialMessage(user.sellerName || 'tu negocio');
  }

  @Post('chat')
  async message(
    @CurrentUser() user: UserPayload,
    @Body() body: {
      message: string;
      history?: { role: string; content: string }[];
      setup?: Record<string, unknown>;
      phase?: string;
    },
  ) {
    return this.chat.chat(
      user.sellerId,
      user.userId,
      body.message,
      body.history || [],
      (body.setup || {}) as any,
      body.phase as any,
    );
  }

  @Post('apply')
  async apply(
    @CurrentUser() user: UserPayload,
    @Body() body: { setup: Record<string, unknown> },
  ) {
    return this.chat.apply(user.sellerId, user.userId, body.setup as any);
  }
}
