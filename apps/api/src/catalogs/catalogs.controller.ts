import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
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

  @StaffOnly()
  @Get('presales/:id')
  getPresale(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.presalesService.getById(user, id);
  }

  @StaffOnly()
  @Patch('presales/:id/confirm')
  confirmPresale(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.presalesService.confirm(user, id);
  }

  @StaffOnly()
  @Patch('presales/:id/cancel')
  cancelPresale(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.presalesService.cancel(user, id);
  }

  @StaffOnly()
  @Post('presales/:id/convert-invoice')
  convertPresale(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: {
    invoiceType?: 'cash' | 'credit';
    isFiscal?: boolean;
    comprobanteType?: string;
    issue?: boolean;
  }) {
    return this.presalesService.convertToInvoice(user, id, body);
  }

  @StaffOnly()
  @Get(':id')
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.catalogsService.getById(user, id);
  }

  @StaffOnly()
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: {
    name?: string; slug?: string; description?: string;
    isPresale?: boolean; isPublic?: boolean; productIds?: string[];
  }) {
    return this.catalogsService.update(user, id, body);
  }
}
