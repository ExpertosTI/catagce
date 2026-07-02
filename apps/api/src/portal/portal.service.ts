import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, gte, inArray } from 'drizzle-orm';
import {
  invoices, clientAllocations, products, importShipments, stockLevels, clients,
  dispatches, dispatchItems, invoiceItems, invoicePayments, catalogs,
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

  async activeCatalog(user: AuthUser) {
    const [catalog] = await this.db.select({ slug: catalogs.slug, name: catalogs.name })
      .from(catalogs)
      .where(and(eq(catalogs.companyId, user.companyId), eq(catalogs.isPublic, true), eq(catalogs.isPresale, true)))
      .orderBy(desc(catalogs.createdAt))
      .limit(1);
    return catalog ?? null;
  }
}

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async summary(user: AuthUser) {
    const companyId = user.companyId;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const [invoiceStats] = await this.db.select({
      total: sql<number>`COUNT(*)::int`,
      creditPending: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.invoiceType} = 'credit' AND ${invoices.status} != 'paid' AND ${invoices.status} != 'cancelled' THEN ${invoices.totalAmount}::numeric - ${invoices.paidAmount}::numeric ELSE 0 END), 0)`,
      paidCount: sql<number>`COUNT(CASE WHEN ${invoices.status} = 'paid' THEN 1 END)::int`,
      openCount: sql<number>`COUNT(CASE WHEN ${invoices.status} IN ('issued', 'partially_paid', 'overdue') THEN 1 END)::int`,
    }).from(invoices).where(eq(invoices.companyId, companyId));

    const [pendingDispatch] = await this.db.select({
      count: sql<number>`COUNT(*)::int`,
      units: sql<number>`COALESCE(SUM(${clientAllocations.pendingQty}), 0)::int`,
    }).from(clientAllocations)
      .where(and(eq(clientAllocations.companyId, companyId), sql`${clientAllocations.pendingQty} > 0`));

    const [stockSummary] = await this.db.select({
      totalUnits: sql<number>`COALESCE(SUM(${stockLevels.totalQty}), 0)::int`,
      inWarehouse: sql<number>`COALESCE(SUM(${stockLevels.totalQty} - ${stockLevels.reservedQty} - ${stockLevels.dispatchedQty}), 0)::int`,
      reserved: sql<number>`COALESCE(SUM(${stockLevels.reservedQty}), 0)::int`,
    }).from(stockLevels).where(eq(stockLevels.companyId, companyId));

    const [activeClients] = await this.db.select({
      count: sql<number>`COUNT(*)::int`,
    }).from(clients).where(and(eq(clients.companyId, companyId), eq(clients.status, 'active')));

    const [paymentsToday] = await this.db.select({
      count: sql<number>`COUNT(*)::int`,
      total: sql<string>`COALESCE(SUM(${invoicePayments.amount}), 0)`,
    })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .where(and(eq(invoices.companyId, companyId), gte(invoicePayments.paidAt, todayStart)));

    const [salesMonth] = await this.db.select({
      total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
      .from(invoices)
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.issuedAt, monthStart),
        inArray(invoices.status, ['issued', 'paid', 'partially_paid', 'overdue']),
      ));

    const [overdue] = await this.db.select({
      count: sql<number>`COUNT(*)::int`,
      total: sql<string>`COALESCE(SUM(${invoices.totalAmount}::numeric - ${invoices.paidAmount}::numeric), 0)`,
    })
      .from(invoices)
      .where(and(eq(invoices.companyId, companyId), eq(invoices.status, 'overdue')));

    const recentPayments = await this.db.select({
      id: invoicePayments.id,
      amount: invoicePayments.amount,
      method: invoicePayments.method,
      paidAt: invoicePayments.paidAt,
      invoiceReference: invoices.reference,
      clientName: clients.name,
    })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.companyId, companyId))
      .orderBy(desc(invoicePayments.paidAt))
      .limit(6);

    const recentInvoices = await this.db.select({
      id: invoices.id,
      reference: invoices.reference,
      ncf: invoices.ncf,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      clientName: clients.name,
      issuedAt: invoices.issuedAt,
    })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.companyId, companyId))
      .orderBy(desc(invoices.issuedAt))
      .limit(6);

    const imports = await this.db.select().from(importShipments)
      .where(eq(importShipments.companyId, companyId))
      .orderBy(desc(importShipments.createdAt)).limit(5);

    const insights: Array<{ type: 'success' | 'warning' | 'info' | 'ai'; text: string }> = [];

    const creditPending = parseFloat(invoiceStats?.creditPending ?? '0');
    if (creditPending > 0) {
      insights.push({ type: 'warning', text: `Hay RD$ ${creditPending.toLocaleString('es-DO', { minimumFractionDigits: 2 })} por cobrar en cuentas de crédito.` });
    }
    if ((overdue?.count ?? 0) > 0) {
      insights.push({ type: 'warning', text: `${overdue.count} factura(s) vencida(s) requieren seguimiento de cobro.` });
    }
    if ((pendingDispatch?.count ?? 0) > 0) {
      insights.push({ type: 'info', text: `${pendingDispatch.count} despachos pendientes (${pendingDispatch.units} unidades por entregar).` });
    }
    const paidToday = parseFloat(paymentsToday?.total ?? '0');
    if (paidToday > 0) {
      insights.push({ type: 'success', text: `Hoy se han cobrado RD$ ${paidToday.toLocaleString('es-DO', { minimumFractionDigits: 2 })} en ${paymentsToday?.count ?? 0} pago(s).` });
    }
    if ((stockSummary?.inWarehouse ?? 0) < 50 && (stockSummary?.inWarehouse ?? 0) > 0) {
      insights.push({ type: 'warning', text: `Inventario bajo: solo ${stockSummary.inWarehouse} unidades disponibles en almacén.` });
    }
    if (!insights.length) {
      insights.push({ type: 'success', text: 'Operaciones al día. No hay alertas críticas en este momento.' });
    }

    return {
      invoices: invoiceStats,
      pendingDispatch,
      stock: stockSummary,
      activeClients: activeClients?.count ?? 0,
      paymentsToday,
      salesMonth,
      overdue,
      recentPayments,
      recentInvoices,
      recentImports: imports,
      insights,
      updatedAt: new Date().toISOString(),
    };
  }
}
