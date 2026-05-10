import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: UserPayload) {
    return this.catalogsService.findAll(user.sellerId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: UserPayload, @Body() createCatalogDto: any) {
    return this.catalogsService.create(user.sellerId, createCatalogDto);
  }

  // Public endpoint — no auth required; resolved via slug only
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.catalogsService.findBySlug(slug);
  }
}
