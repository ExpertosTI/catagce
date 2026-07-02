import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CatalogsService, PresalesService } from './catalogs.service';
import { StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('catalogs')
export class CatalogsController {
  constructor(
    private catalogsService: CatalogsService,
    private presalesService: PresalesService,
  ) {}

  @StaffOnly()
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.catalogsService.list(user);
  }

  @StaffOnly()
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.catalogsService.create(user, body);
  }

  @Public()
  @Get('public/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.catalogsService.getBySlug('', slug);
  }

  @StaffOnly()
  @Get('presales')
  listPresales(@CurrentUser() user: AuthUser) {
    return this.presalesService.list(user);
  }

  @StaffOnly()
  @Post('presales')
  createPresale(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.presalesService.create(user, body);
  }
}
