import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  async findAll(@CurrentUser() user: UserPayload) {
    return this.integrationsService.findAll(user.sellerId);
  }

  @Post()
  async create(
    @CurrentUser() user: UserPayload,
    @Body() body: { type: string; name: string; config: Record<string, unknown> },
  ) {
    return this.integrationsService.create(user.sellerId, body);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body() body: { name?: string; config?: Record<string, unknown>; isActive?: boolean },
  ) {
    return this.integrationsService.update(id, user.sellerId, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.integrationsService.delete(id, user.sellerId);
  }

  @Post(':id/sync')
  async sync(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.integrationsService.sync(id, user.sellerId);
  }
}
