import {
  Controller, Get, Post, Patch, Param, Body, Sse, UploadedFile, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Observable, interval, merge, switchMap, startWith } from 'rxjs';
import { MobileService } from './mobile.service';
import { InventoryBroadcastService } from './inventory-broadcast.service';
import { CurrentUser } from '../common/decorators/user.decorator';
import { StaffOnly, ClientOnly } from '../common/decorators/roles.decorator';
import { AuthUser } from '../auth/auth.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'catalog-pdfs');

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Controller('mobile')
export class MobileController {
  constructor(
    private mobileService: MobileService,
    private inventoryBroadcast: InventoryBroadcastService,
  ) {}

  @Get('catalog/pdf')
  getCatalogPdf(@CurrentUser() user: AuthUser) {
    return this.mobileService.getActiveCatalogPdf(user);
  }

  @StaffOnly()
  @Post('catalog/pdf')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        ensureUploadDir();
        cb(null, UPLOAD_DIR);
      },
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        cb(null, `${unique}${extname(file.originalname) || '.pdf'}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== 'application/pdf') {
        cb(new Error('Solo se permiten archivos PDF'), false);
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  async uploadCatalogPdf(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
  ) {
    if (!file) throw new BadRequestException('Archivo PDF requerido');
    const fileUrl = `/api/files/catalog-pdfs/${file.filename}`;
    return this.mobileService.uploadCatalogPdf(user, {
      title: title?.trim() || file.originalname,
      fileName: file.originalname,
      fileUrl,
    });
  }

  @Get('inventory')
  getInventory(@CurrentUser() user: AuthUser) {
    return this.mobileService.getInventoryLive(user);
  }

  @Sse('inventory/stream')
  streamInventory(@CurrentUser() user: AuthUser): Observable<{ data: unknown }> {
    const live$ = interval(15000).pipe(
      startWith(0),
      switchMap(() => this.mobileService.getInventoryLive(user)),
      switchMap((snapshot) => [{ data: snapshot }]),
    );
    return merge(live$, this.inventoryBroadcast.observe(user.companyId));
  }

  @ClientOnly()
  @Post('orders')
  createOrder(
    @CurrentUser() user: AuthUser,
    @Body() body: { notes?: string; items: { productId: string; quantity: number; notes?: string }[] },
  ) {
    return this.mobileService.createOrderRequest(user, body);
  }

  @Get('orders')
  listOrders(@CurrentUser() user: AuthUser) {
    return this.mobileService.listOrderRequests(user);
  }

  @Get('orders/:id')
  getOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mobileService.getOrderRequest(user, id);
  }

  @StaffOnly()
  @Patch('orders/:id/prices')
  adjudicatePrices(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { items: { id: string; unitPrice: number }[]; confirm?: boolean },
  ) {
    return this.mobileService.adjudicatePrices(user, id, body);
  }

  @StaffOnly()
  @Post('inventory/refresh')
  async refreshInventory(@CurrentUser() user: AuthUser) {
    return this.mobileService.publishInventoryUpdate(user);
  }
}
