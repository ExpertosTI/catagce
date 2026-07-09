import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WhatsAppInboxService } from './whatsapp-inbox.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

@Controller('whatsapp-inbox')
export class WhatsAppInboxController {
  constructor(
    private readonly inbox: WhatsAppInboxService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @Get('status')
  status() {
    return this.whatsapp.status();
  }

  @Post('sync')
  sync(@CurrentUser() user: UserPayload) {
    return this.inbox.syncTickets(user.sellerId);
  }

  @Get('labels')
  labels(@CurrentUser() user: UserPayload) {
    return this.inbox.listLabels(user.sellerId);
  }

  @Post('labels')
  createLabel(@CurrentUser() user: UserPayload, @Body() body: { name: string; color?: string }) {
    return this.inbox.createLabel(user.sellerId, body);
  }

  @Get('tickets')
  tickets(
    @CurrentUser() user: UserPayload,
    @Query('status') status?: string,
    @Query('labelId') labelId?: string,
  ) {
    return this.inbox.listTickets(user.sellerId, { status, labelId });
  }

  @Get('tickets/:id/messages')
  messages(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.inbox.getMessages(user.sellerId, id);
  }

  @Patch('tickets/:id/status')
  updateStatus(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.inbox.updateStatus(user.sellerId, id, status);
  }

  @Patch('tickets/:id/labels/:labelId')
  toggleLabel(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Param('labelId') labelId: string,
  ) {
    return this.inbox.toggleLabel(user.sellerId, id, labelId);
  }

  @Post('tickets/:id/reply')
  reply(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body('text') text: string,
  ) {
    return this.inbox.sendReply(user.sellerId, id, text);
  }

  @Get('quick-replies')
  quickReplies(@CurrentUser() user: UserPayload) {
    return this.inbox.listQuickReplies(user.sellerId);
  }

  @Post('quick-replies')
  createQuickReply(
    @CurrentUser() user: UserPayload,
    @Body() body: { title: string; body: string; shortcut?: string },
  ) {
    return this.inbox.createQuickReply(user.sellerId, body);
  }

  @Delete('quick-replies/:id')
  deleteQuickReply(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.inbox.deleteQuickReply(user.sellerId, id);
  }
}
