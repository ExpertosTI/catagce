import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  invoices, clientAllocations, products, importShipments, stockLevels, clients,
  dispatches, dispatchItems, invoiceItems, invoicePayments,
} from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';

@Injectable()
export class PortalService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async myInvoices(user: AuthUser) {
    return this.db.select({
      id: invoices.id,
      reference: invoices.reference,
      invoiceType: invoices.invoiceType,
      status: invoices.status,
      subtotal: invoices.subtotal,
      taxAmount: invoices.taxAmount,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      dueDate: invoices.dueDate,
      issuedAt: invoices.issuedAt,
      clientName: clients.name,
    })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.companyId, user.companyId), eq(invoices.clientId, user.userId)))
      .orderBy(desc(invoices.issuedAt));
  }

  async myInvoiceDetail(user: AuthUser, invoiceId: string) {
    const [invoice] = await this.db.select().from(invoices)
      .where(and(
        eq(invoices.id, invoiceId),
        eq(invoices.companyId, user.companyId),
        eq(invoices.clientId, user.userId),
      )).limit(1);
    if (!invoice) throw new NotFoundException('Factura no encontrada');

    const items = await this.db.select({
      id: invoiceItems.id,
      productName: products.name,
      productSku: products.sku,
      quantity: invoiceItems.quantity,
      unitPrice: invoiceItems.unitPrice,
      lineTotal: invoiceItems.lineTotal,
      dispatchedQty: invoiceItems.dispatchedQty,
    })
      .from(invoiceItems)
      .innerJoin(products, eq(invoiceItems.productId, products.id))
      .where(eq(invoiceItems.invoiceId, invoiceId));

    const payments = await this.db.select().from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, invoiceId));

    const [client] = await this.db.select({
      name: clients.name,
      phone: clients.phone,
      email: clients.email,
      code: clients.code,
    }).from(clients).where(eq(clients.id, invoice.clientId)).limit(1);

    return { ...invoice, client, clientName: client?.name, items, payments };
  }

  async myPendingMerchandise(user: AuthUser) {
    return this.db.select({
      productName: products.name,
      productSku: products.sku,
      allocatedQty: clientAllocations.allocatedQty,
      dispatchedQty: clientAllocations.dispatchedQty,
      pendingQty: clientAllocations.pendingQty,
      status: clientAllocations.status,
    })
      .from(clientAllocations)
      .innerJoin(products, eq(clientAllocations.productId, products.id))
      .where(and(
        eq(clientAllocations.companyId, user.companyId),
        eq(clientAllocations.clientId, user.userId),
        sql`${clientAllocations.pendingQty} > 0`,
      ));
  }

  async myDispatches(user: AuthUser) {
    const rows = await this.db.select({
      id: dispatches.id,
      reference: dispatches.reference,
      status: dispatches.status,
      dispatchedAt: dispatches.dispatchedAt,
      notes: dispatches.notes,
      invoiceReference: invoices.reference,
    })
      .from(dispatches)
      .leftJoin(invoices, eq(dispatches.invoiceId, invoices.id))
      .where(and(
        eq(dispatches.companyId, user.companyId),
        eq(dispatches.clientId, user.userId),
      ))
      .orderBy(desc(dispatches.dispatchedAt));

    const result = [];
    for (const row of rows) {
      const items = await this.db.select({
        quantity: dispatchItems.quantity,
        productName: products.name,
        productSku: products.sku,
      })
        .from(dispatchItems)
        .innerJoin(products, eq(dispatchItems.productId, products.id))
        .where(eq(dispatchItems.dispatchId, row.id));
      result.push({ ...row, items });
    }
    return result;
  }

  async myProfile(user: AuthUser) {
    const [client] = await this.db.select().from(clients).where(eq(clients.id, user.userId)).limit(1);
    const balance = await this.db.select({
      totalDue: sql<string>`COALESCE(SUM(${invoices.totalAmount}::numeric - ${invoices.paidAmount}::numeric), 0)`,
    })
      .from(invoices)
      .where(and(
        eq(invoices.clientId, user.userId),
        sql`${invoices.status} IN ('issued', 'partially_paid', 'overdue')`,
      ));

    return {
      client: {
        id: client.id, code: client.code, name: client.name, email: client.email,
        phone: client.phone, creditLimit: client.creditLimit, creditDays: client.creditDays,
      },
      balanceDue: balance[0]?.totalDue ?? '0',
    };
  }
}

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async summary(user: AuthUser) {
    const [invoiceStats] = await this.db.select({
      total: sql<number>`COUNT(*)::int`,
      creditPending: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.invoiceType} = 'credit' AND ${invoices.status} != 'paid' THEN ${invoices.totalAmount}::numeric - ${invoices.paidAmount}::numeric ELSE 0 END), 0)`,
    }).from(invoices).where(eq(invoices.companyId, user.companyId));

    const [pendingDispatch] = await this.db.select({
      count: sql<number>`COUNT(*)::int`,
      units: sql<number>`COALESCE(SUM(${clientAllocations.pendingQty}), 0)::int`,
    }).from(clientAllocations)
      .where(and(eq(clientAllocations.companyId, user.companyId), sql`${clientAllocations.pendingQty} > 0`));

    const [stockSummary] = await this.db.select({
      totalUnits: sql<number>`COALESCE(SUM(${stockLevels.totalQty}), 0)::int`,
      inWarehouse: sql<number>`COALESCE(SUM(${stockLevels.totalQty} - ${stockLevels.reservedQty} - ${stockLevels.dispatchedQty}), 0)::int`,
      reserved: sql<number>`COALESCE(SUM(${stockLevels.reservedQty}), 0)::int`,
    }).from(stockLevels).where(eq(stockLevels.companyId, user.companyId));

    const [activeClients] = await this.db.select({
      count: sql<number>`COUNT(*)::int`,
    }).from(clients).where(and(eq(clients.companyId, user.companyId), eq(clients.status, 'active')));

    const imports = await this.db.select().from(importShipments)
      .where(eq(importShipments.companyId, user.companyId))
      .orderBy(desc(importShipments.createdAt)).limit(5);

    return {
      invoices: invoiceStats,
      pendingDispatch,
      stock: stockSummary,
      activeClients: activeClients?.count ?? 0,
      recentImports: imports,
    };
  }
}
