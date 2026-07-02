import { Controller, Post, Body } from '@nestjs/common';
import { AiService, ChatMessage } from './ai.service';
import { StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';

@StaffOnly()
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('chat')
  chat(@CurrentUser() user: AuthUser, @Body() body: { message: string; history?: ChatMessage[] }) {
    return this.aiService.staffChat(user, body.message, body.history);
  }
}
