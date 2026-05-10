import { Controller, Get, Post, Body, Param, UseInterceptors } from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { TenantInterceptor } from '../common/interceptors/tenant.interceptor';

@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  @UseInterceptors(TenantInterceptor)
  async findAll(@CurrentUser() user: UserPayload) {
    return this.catalogsService.findAll(user.sellerId);
  }

  @Post()
  @UseInterceptors(TenantInterceptor)
  async create(@CurrentUser() user: UserPayload, @Body() createCatalogDto: any) {
    return this.catalogsService.create(user.sellerId, createCatalogDto);
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.catalogsService.findBySlug(slug);
  }
}
