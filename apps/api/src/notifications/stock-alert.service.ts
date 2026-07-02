import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { products, stockLevels, warehouses } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { NotificationsService } from './notifications.service';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEDUPE_WINDOW_HOURS = 24;

@Injectable()
export class StockAlertService implements OnModuleInit {
  private readonly logger = new Logger(StockAlertService.name);

  constructor(
    @Inject(DRIZZLE) private db: any,
    private notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    setTimeout(() => this.runCheck().catch((err) => this.logger.error(err)), 25_000);
    setInterval(() => this.runCheck().catch((err) => this.logger.error(err)), CHECK_INTERVAL_MS);
  }

  async runCheck() {
    const rows = await this.db.select({
      companyId: stockLevels.companyId,
      productId: products.id,
      sku: products.sku,
      name: products.name,
      minStock: products.minStock,
      totalQty: stockLevels.totalQty,
      reservedQty: stockLevels.reservedQty,
      dispatchedQty: stockLevels.dispatchedQty,
    })
      .from(stockLevels)
      .innerJoin(products, eq(stockLevels.productId, products.id))
      .innerJoin(warehouses, eq(stockLevels.warehouseId, warehouses.id))
      .where(eq(products.isActive, true));

    const byProduct = new Map<string, {
      companyId: string; productId: string; sku: string; name: string;
      minStock: number; availableQty: number;
    }>();

    for (const r of rows) {
      const available = r.totalQty - r.reservedQty - r.dispatchedQty;
      const key = `${r.companyId}:${r.productId}`;
      if (!byProduct.has(key)) {
        byProduct.set(key, {
          companyId: r.companyId,
          productId: r.productId,
          sku: r.sku,
          name: r.name,
          minStock: r.minStock ?? 0,
          availableQty: 0,
        });
      }
      byProduct.get(key)!.availableQty += available;
    }

    let processed = 0;
    for (const p of byProduct.values()) {
      if (p.availableQty > p.minStock) continue;

      const alreadyNotified = await this.notificationsService.existsRecent(
        p.companyId, p.productId, 'low_stock', DEDUPE_WINDOW_HOURS,
      );
      if (alreadyNotified) continue;

      const title = `Stock bajo: ${p.name}`;
      const body = p.availableQty <= 0
        ? `${p.sku} sin unidades disponibles (mínimo ${p.minStock}). Reabastezca inventario.`
        : `Quedan ${p.availableQty} unidad(es) de ${p.sku} (mínimo ${p.minStock}). Valor en riesgo de agotarse.`;

      await this.notificationsService.create({
        companyId: p.companyId,
        audience: 'staff',
        type: 'low_stock',
        title,
        body,
        invoiceId: p.productId,
      });
      processed += 1;
    }

    if (processed > 0) this.logger.log(`Alertas de inventario generadas: ${processed}`);
    return { processed };
  }
}
