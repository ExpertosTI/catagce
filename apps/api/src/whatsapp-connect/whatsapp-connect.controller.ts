import { Controller, Get, Post } from '@nestjs/common';
import { WhatsAppConnectService } from './whatsapp-connect.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

@Controller('whatsapp-connect')
export class WhatsAppConnectController {
  constructor(private readonly connect: WhatsAppConnectService) {}

  @Get('status')
  status(@CurrentUser() user: UserPayload) {
    return this.connect.status(user.sellerId);
  }

  @Post('start')
  start(@CurrentUser() user: UserPayload) {
    return this.connect.start(user.sellerId);
  }

  @Post('refresh')
  refresh(@CurrentUser() user: UserPayload) {
    return this.connect.refresh(user.sellerId);
  }

  @Post('disconnect')
  disconnect(@CurrentUser() user: UserPayload) {
    return this.connect.disconnect(user.sellerId);
  }
}
