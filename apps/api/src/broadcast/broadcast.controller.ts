import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { BroadcastService } from './broadcast.service';
import { StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';

@StaffOnly()
@Controller('broadcast')
export class BroadcastController {
  constructor(private broadcastService: BroadcastService) {}

  @Get('status')
  status() {
    return this.broadcastService.status();
  }

  @Get('contacts')
  listContacts(@CurrentUser() user: AuthUser) {
    return this.broadcastService.listContacts(user);
  }

  @Post('contacts')
  createContact(@CurrentUser() user: AuthUser, @Body() body: { name: string; phone: string; notes?: string }) {
    return this.broadcastService.createContact(user, body);
  }

  @Post('contacts/import-clients')
  importClients(@CurrentUser() user: AuthUser) {
    return this.broadcastService.importFromClients(user);
  }

  @Get('lists')
  listLists(@CurrentUser() user: AuthUser) {
    return this.broadcastService.listLists(user);
  }

  @Post('lists')
  createList(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; color?: string; contactIds: string[] },
  ) {
    return this.broadcastService.createList(user, body);
  }

  @Get('campaigns')
  listCampaigns(@CurrentUser() user: AuthUser) {
    return this.broadcastService.listCampaigns(user);
  }

  @Post('campaigns')
  createCampaign(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.broadcastService.createCampaign(user, body as any);
  }

  @Get('campaigns/:id')
  getCampaign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.broadcastService.getCampaign(user, id);
  }

  @Post('campaigns/:id/start')
  startCampaign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.broadcastService.startCampaign(user, id);
  }

  @Patch('campaigns/:id')
  updateCampaign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { action: 'pause' | 'resume' },
  ) {
    return this.broadcastService.updateCampaignStatus(user, id, body.action);
  }
}
