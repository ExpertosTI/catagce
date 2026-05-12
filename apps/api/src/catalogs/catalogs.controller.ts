import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
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

  @Post(':id/products')
  @UseGuards(JwtAuthGuard)
  addProduct(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body('productId') productId: string,
  ) {
    return this.catalogsService.addProduct(user.sellerId, id, productId);
  }

  @Delete(':id/products/:productId')
  @UseGuards(JwtAuthGuard)
  removeProduct(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.catalogsService.removeProduct(user.sellerId, id, productId);
  }

  // Public endpoint — no auth required; resolved via slug only
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.catalogsService.findBySlug(slug);
  }
}
