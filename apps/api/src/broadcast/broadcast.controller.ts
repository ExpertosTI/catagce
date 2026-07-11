import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BroadcastService } from './broadcast.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

type CampaignBody = {
  listId: string;
  name: string;
  messageText: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  delayMinSec?: number;
  delayMaxSec?: number;
};

@Controller('broadcast')
export class BroadcastController {
  constructor(private readonly broadcast: BroadcastService) {}

  @Get('lists')
  lists(@CurrentUser() user: UserPayload) {
    return this.broadcast.listLists(user.sellerId);
  }

  @Post('lists')
  createList(@CurrentUser() user: UserPayload, @Body() body: { name: string; description?: string }) {
    return this.broadcast.createList(user.sellerId, body);
  }

  @Post('lists/:id/members')
  addMembers(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() body: { members: Array<{ phone: string; name: string; buyerContactId?: string }> },
  ) {
    return this.broadcast.addMembers(id, user.sellerId, body.members || []);
  }

  @Delete('lists/:listId/members/:memberId')
  removeMember(
    @CurrentUser() user: UserPayload,
    @Param('listId') listId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.broadcast.removeMember(listId, user.sellerId, memberId);
  }

  @Get('campaigns')
  campaigns(@CurrentUser() user: UserPayload) {
    return this.broadcast.listCampaigns(user.sellerId);
  }

  @Post('campaigns')
  createCampaign(@CurrentUser() user: UserPayload, @Body() body: CampaignBody) {
    return this.broadcast.createCampaign(user.sellerId, body);
  }

  @Get('campaigns/:id')
  getCampaign(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.broadcast.getCampaign(user.sellerId, id);
  }

  @Patch('campaigns/:id')
  updateCampaign(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() body: Partial<CampaignBody>,
  ) {
    return this.broadcast.updateCampaign(user.sellerId, id, body);
  }

  @Post('campaigns/:id/duplicate')
  duplicate(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.broadcast.duplicateCampaign(user.sellerId, id);
  }

  @Post('campaigns/:id/start')
  start(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.broadcast.startCampaign(user.sellerId, id);
  }

  @Post('campaigns/:id/pause')
  pause(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.broadcast.pauseCampaign(user.sellerId, id);
  }

  @Post('campaigns/:id/retry-failed')
  retryFailed(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.broadcast.retryFailed(user.sellerId, id);
  }
}
