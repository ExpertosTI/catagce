import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  async findAll(@CurrentUser() user: UserPayload) {
    return this.catalogsService.findAll(user.sellerId);
  }

  @Post()
  async create(
    @CurrentUser() user: UserPayload,
    @Body() body: { name: string; slug: string; description?: string; productIds?: string[] },
  ) {
    return this.catalogsService.create(user.sellerId, body);
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.catalogsService.publish(id, user.sellerId);
  }

  @Post(':id/share-whatsapp')
  async shareWhatsApp(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body() body: { phones: string[]; message?: string; imageUrl?: string },
  ) {
    return this.catalogsService.shareViaWhatsApp(user.sellerId, id, body);
  }

  @Get(':slug')
  @Public()
  async findBySlug(@Param('slug') slug: string) {
    return this.catalogsService.findBySlug(slug);
  }
}
