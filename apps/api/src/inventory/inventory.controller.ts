import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { RequireFeature } from '../common/decorators/feature.decorator';
import { FeatureGuard } from '../common/guards/feature.guard';

@Controller('inventory')
@RequireFeature('inventory')
@UseGuards(FeatureGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('warehouses')
  getWarehouses(@CurrentUser() user: UserPayload) {
    return this.inventoryService.getWarehouses(user.sellerId);
  }

  @Post('warehouses')
  createWarehouse(@CurrentUser() user: UserPayload, @Body() body: { name: string; address?: string }) {
    return this.inventoryService.createWarehouse(user.sellerId, body);
  }

  @Get('levels')
  getStockLevels(@CurrentUser() user: UserPayload) {
    return this.inventoryService.getStockLevels(user.sellerId);
  }

  @Get('movements')
  getMovements(@CurrentUser() user: UserPayload) {
    return this.inventoryService.getMovements(user.sellerId);
  }

  @Get('uoms')
  getUoms(@CurrentUser() user: UserPayload) {
    return this.inventoryService.getUoms(user.sellerId);
  }

  @Get('low-stock')
  getLowStock(@CurrentUser() user: UserPayload) {
    return this.inventoryService.getLowStock(user.sellerId);
  }

  @Post('adjust')
  adjustStock(@CurrentUser() user: UserPayload, @Body() body: {
    warehouseId: string; productId: string; quantity: number; uomId?: number; notes?: string;
  }) {
    return this.inventoryService.adjustStock(user.sellerId, { ...body, actorUserId: user.userId });
  }

  @Post('inbound')
  inbound(@CurrentUser() user: UserPayload, @Body() body: {
    warehouseId: string; productId: string; quantity: number; uomId?: number; notes?: string;
  }) {
    return this.inventoryService.inbound(user.sellerId, { ...body, actorUserId: user.userId });
  }
}
