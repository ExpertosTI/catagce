import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  async findAll(@CurrentUser() user: UserPayload) {
    return this.webhooksService.findAll(user.sellerId);
  }

  @Post()
  async create(
    @CurrentUser() user: UserPayload,
    @Body() body: { url: string; events: string[] },
  ) {
    return this.webhooksService.create(user.sellerId, body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body() body: { url?: string; events?: string[]; isActive?: boolean },
  ) {
    return this.webhooksService.update(id, user.sellerId, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.webhooksService.delete(id, user.sellerId);
  }

  @Get(':id/deliveries')
  async getDeliveries(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.webhooksService.getDeliveries(id, user.sellerId);
  }
}
