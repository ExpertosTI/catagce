import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, gte, lte, inArray, sql } from 'drizzle-orm';
import {
  invoices, clients, invoicePayments, products, stockLevels, warehouses,
} from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async accountsReceivable(user: AuthUser) {
    const rows = await this.db.select({
      clientId: clients.id,
      clientName: clients.name,
      clientCode: clients.code,
      clientPhone: clients.phone,
      reference: invoices.reference,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      dueDate: invoices.dueDate,
      status: invoices.status,
    })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(
        eq(invoices.companyId, user.companyId),
        inArray(invoices.status, ['issued', 'partially_paid', 'overdue']),
      ))
      .orderBy(invoices.dueDate);

    const now = Date.now();
    const buckets = { corriente: 0, dias1a30: 0, dias31a60: 0, dias61a90: 0, dias90mas: 0 };
    const byClient = new Map<string, any>();

    for (const r of rows) {
      const balance = parseFloat(r.totalAmount) - parseFloat(r.paidAmount);
      if (balance <= 0.01) continue;
      const daysOverdue = r.dueDate ? Math.floor((now - new Date(r.dueDate).getTime()) / 86400000) : -1;

      let bucket: keyof typeof buckets = 'corriente';
      if (daysOverdue > 90) bucket = 'dias90mas';
      else if (daysOverdue > 60) bucket = 'dias61a90';
      else if (daysOverdue > 30) bucket = 'dias31a60';
      else if (daysOverdue > 0) bucket = 'dias1a30';
      buckets[bucket] += balance;

      if (!byClient.has(r.clientId)) {
        byClient.set(r.clientId, {
          clientId: r.clientId, clientName: r.clientName, clientCode: r.clientCode, clientPhone: r.clientPhone,
          totalBalance: 0, invoiceCount: 0, oldestDueDate: r.dueDate, invoices: [],
        });
      }
      const c = byClient.get(r.clientId);
      c.totalBalance += balance;
      c.invoiceCount += 1;
      if (r.dueDate && (!c.oldestDueDate || new Date(r.dueDate) < new Date(c.oldestDueDate))) {
        c.oldestDueDate = r.dueDate;
      }
      c.invoices.push({ reference: r.reference, balance, dueDate: r.dueDate, status: r.status, daysOverdue });
    }

    const clientsList = [...byClient.values()].sort((a, b) => b.totalBalance - a.totalBalance);
    const totalPending = clientsList.reduce((s, c) => s + c.totalBalance, 0);

    return { totalPending, buckets, clients: clientsList };
  }

  async salesSummary(user: AuthUser, from?: string, to?: string) {
    const conditions = [eq(invoices.companyId, user.companyId)];
    if (from) conditions.push(gte(invoices.issuedAt, new Date(from)));
    if (to) conditions.push(lte(invoices.issuedAt, new Date(`${to}T23:59:59`)));
    conditions.push(sql`${invoices.status} != 'draft'`);

    const rows = await this.db.select({
      reference: invoices.reference,
      invoiceType: invoices.invoiceType,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      issuedAt: invoices.issuedAt,
      clientId: clients.id,
      clientName: clients.name,
    })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.issuedAt));

    const totalFacturado = rows.reduce((s: number, r: any) => s + parseFloat(r.totalAmount), 0);
    const totalCobrado = rows.reduce((s: number, r: any) => s + parseFloat(r.paidAmount), 0);
    const totalCredito = rows.filter((r: any) => r.invoiceType === 'credit').reduce((s: number, r: any) => s + parseFloat(r.totalAmount), 0);
    const totalContado = rows.filter((r: any) => r.invoiceType === 'cash').reduce((s: number, r: any) => s + parseFloat(r.totalAmount), 0);

    const byClientMap = new Map<string, { clientName: string; total: number; count: number }>();
    for (const r of rows) {
      if (!byClientMap.has(r.clientId)) byClientMap.set(r.clientId, { clientName: r.clientName, total: 0, count: 0 });
      const c = byClientMap.get(r.clientId)!;
      c.total += parseFloat(r.totalAmount);
      c.count += 1;
    }
    const topClients = [...byClientMap.values()].sort((a, b) => b.total - a.total).slice(0, 10);

    return {
      totalFacturado,
      totalCobrado,
      totalPendiente: Math.max(0, totalFacturado - totalCobrado),
      totalCredito,
      totalContado,
      cantidadFacturas: rows.length,
      topClients,
      invoices: rows,
    };
  }

  async inventory(user: AuthUser) {
    const rows = await this.db.select({
      productId: products.id,
      sku: products.sku,
      name: products.name,
      costPrice: products.costPrice,
      salePrice: products.salePrice,
      minStock: products.minStock,
      isActive: products.isActive,
      warehouseName: warehouses.name,
      totalQty: stockLevels.totalQty,
      reservedQty: stockLevels.reservedQty,
      dispatchedQty: stockLevels.dispatchedQty,
    })
      .from(stockLevels)
      .innerJoin(products, eq(stockLevels.productId, products.id))
      .innerJoin(warehouses, eq(stockLevels.warehouseId, warehouses.id))
      .where(and(eq(stockLevels.companyId, user.companyId), eq(products.isActive, true)));

    const byProduct = new Map<string, any>();
    for (const r of rows) {
      const available = r.totalQty - r.reservedQty - r.dispatchedQty;
      if (!byProduct.has(r.productId)) {
        byProduct.set(r.productId, {
          productId: r.productId, sku: r.sku, name: r.name,
          costPrice: r.costPrice, salePrice: r.salePrice, minStock: r.minStock ?? 0,
          totalQty: 0, reservedQty: 0, dispatchedQty: 0, availableQty: 0, warehouses: [],
        });
      }
      const p = byProduct.get(r.productId);
      p.totalQty += r.totalQty;
      p.reservedQty += r.reservedQty;
      p.dispatchedQty += r.dispatchedQty;
      p.availableQty += available;
      p.warehouses.push({ name: r.warehouseName, totalQty: r.totalQty, availableQty: available });
    }

    const list = [...byProduct.values()].map((p) => ({
      ...p,
      valuacionCosto: p.availableQty * parseFloat(p.costPrice ?? '0'),
      valuacionVenta: p.availableQty * parseFloat(p.salePrice ?? '0'),
      bajoStock: p.availableQty <= (p.minStock ?? 0),
    })).sort((a, b) => a.name.localeCompare(b.name));

    const totalValuacionCosto = list.reduce((s, p) => s + p.valuacionCosto, 0);
    const totalValuacionVenta = list.reduce((s, p) => s + p.valuacionVenta, 0);
    const lowStockCount = list.filter((p) => p.bajoStock).length;

    return { products: list, totalValuacionCosto, totalValuacionVenta, lowStockCount };
  }
}
