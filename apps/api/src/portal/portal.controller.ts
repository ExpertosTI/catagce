import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PortalService, DashboardService } from './portal.service';
import { PresalesService } from '../catalogs/catalogs.service';
import { ClientOnly, StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';

@Controller('portal')
export class PortalController {
  constructor(
    private portalService: PortalService,
    private presalesService: PresalesService,
  ) {}

  @ClientOnly()
  @Get('me')
  profile(@CurrentUser() user: AuthUser) {
    return this.portalService.myProfile(user);
  }

  @ClientOnly()
  @Get('invoices')
  invoices(@CurrentUser() user: AuthUser) {
    return this.portalService.myInvoices(user);
  }

  @ClientOnly()
  @Get('invoices/:id')
  invoiceDetail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.portalService.myInvoiceDetail(user, id);
  }

  @ClientOnly()
  @Get('dispatches')
  dispatches(@CurrentUser() user: AuthUser) {
    return this.portalService.myDispatches(user);
  }

  @ClientOnly()
  @Get('pending-merchandise')
  pending(@CurrentUser() user: AuthUser) {
    return this.portalService.myPendingMerchandise(user);
  }

  @ClientOnly()
  @Post('presales')
  createPresale(@CurrentUser() user: AuthUser, @Body() body: {
    catalogId?: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
    notes?: string;
  }) {
    return this.presalesService.create(user, {
      clientId: user.userId,
      catalogId: body.catalogId,
      items: body.items,
      notes: body.notes,
    });
  }
}

@StaffOnly()
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.dashboardService.summary(user);
  }
}
