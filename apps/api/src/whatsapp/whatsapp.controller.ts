import { Body, Controller, Get, Post } from '@nestjs/common';
import { StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CommerceNotifyService } from './commerce-notify.service';
import { WhatsAppService } from './whatsapp.service';
import { isValidPhone } from './phone.util';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private whatsapp: WhatsAppService,
    private commerce: CommerceNotifyService,
  ) {}

  @Public()
  @Get('status')
  status() {
    return this.whatsapp.status();
  }

  @StaffOnly()
  @Get('status/me')
  async myStatus(@CurrentUser() user: AuthUser) {
    const admin = await this.whatsapp.adminPhoneStatus(user.companyId);
    return {
      ...this.whatsapp.status(),
      admin,
      ready: this.whatsapp.evolutionConfigured() && admin.configured,
    };
  }

  @StaffOnly()
  @Post('catalog-share')
  async shareCatalog(
    @CurrentUser() user: AuthUser,
    @Body() body: { catalogId: string; phone: string; recipientName?: string },
  ) {
    if (!body.catalogId || !isValidPhone(body.phone)) {
      return { ok: false, error: 'invalid_request' };
    }
    return this.commerce.shareCatalog(user.companyId, body.catalogId, body.phone, body.recipientName);
  }

  @StaffOnly()
  @Post('send')
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Body() body: { phone: string; message: string },
  ) {
    const message = String(body.message || '').trim().slice(0, 3500);
    if (!message || !isValidPhone(body.phone)) {
      return { ok: false, error: 'invalid_request' };
    }
    return this.whatsapp.sendText(body.phone, message);
  }

  @StaffOnly()
  @Post('send-admin')
  async sendAdmin(@CurrentUser() user: AuthUser, @Body() body: { message: string }) {
    const message = String(body.message || '').trim().slice(0, 3500);
    if (!message) return { ok: false, error: 'empty_message' };
    return this.whatsapp.sendAdmin(user.companyId, message);
  }
}
