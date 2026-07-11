import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { Throttle } from '../common/security/security.util';
import { RequireFeature } from '../common/decorators/feature.decorator';
import { FeatureGuard } from '../common/guards/feature.guard';

@Controller('ai')
@RequireFeature('ai')
@UseGuards(FeatureGuard)
export class AiController {
  constructor(private readonly aiService: AiAssistantService) {}

  @Get('config')
  getConfig(@CurrentUser() user: UserPayload) {
    return this.aiService.getConfig(user.sellerId);
  }

  @Patch('config')
  updateConfig(
    @CurrentUser() user: UserPayload,
    @Body() body: { googleAiApiKey?: string; aiModel?: string; aiEnabled?: boolean },
  ) {
    return this.aiService.updateConfig(user.sellerId, body);
  }

  @Post('chat')
  @Throttle(12, 60_000)
  chat(
    @CurrentUser() user: UserPayload,
    @Body() body: { message: string; sessionId?: string },
  ) {
    return this.aiService.chat(user.sellerId, user.userId, body.message, body.sessionId);
  }

  @Get('sessions')
  getSessions(@CurrentUser() user: UserPayload) {
    return this.aiService.getSessions(user.sellerId);
  }

  @Get('sessions/:id/messages')
  getMessages(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.aiService.getSessionMessages(id, user.sellerId);
  }
}
