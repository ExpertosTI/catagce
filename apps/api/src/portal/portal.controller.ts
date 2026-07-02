import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { PortalService, DashboardService } from './portal.service';
import { PresalesService } from '../catalogs/catalogs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AiService, ChatMessage } from '../ai/ai.service';
import { ClientOnly, StaffOnly } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AuthUser } from '../auth/auth.service';

@Controller('portal')
export class PortalController {
  constructor(
    private portalService: PortalService,
    private presalesService: PresalesService,
    private notificationsService: NotificationsService,
    private aiService: AiService,
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

  @ClientOnly()
  @Get('notifications')
  notifications(@CurrentUser() user: AuthUser, @Query('unread') unread?: string) {
    return this.notificationsService.listForClient(user, unread === 'true');
  }

  @ClientOnly()
  @Get('notifications/unread-count')
  notificationsUnreadCount(@CurrentUser() user: AuthUser) {
    return this.notificationsService.unreadCountClient(user);
  }

  @ClientOnly()
  @Patch('notifications/:id/read')
  markNotificationRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.markRead(user, id);
  }

  @ClientOnly()
  @Patch('notifications/read-all')
  markAllNotificationsRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user, 'client');
  }

  @ClientOnly()
  @Post('ai/chat')
  aiChat(@CurrentUser() user: AuthUser, @Body() body: { message: string; history?: ChatMessage[] }) {
    return this.aiService.clientChat(user, body.message, body.history);
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
