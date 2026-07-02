import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('company/:slug')
  getCompany(@Param('slug') slug: string) {
    return this.publicService.getCompany(slug);
  }

  @Get('company/:slug/catalogs')
  listCatalogs(@Param('slug') slug: string) {
    return this.publicService.listCatalogs(slug);
  }

  @Get('company/:slug/catalog/:catalogSlug')
  getCatalog(@Param('slug') slug: string, @Param('catalogSlug') catalogSlug: string) {
    return this.publicService.getCatalog(slug, catalogSlug);
  }
}
