import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  clients, invoices, invoiceItems, invoicePayments, clientAllocations,
  stockLevels, products, dispatches, dispatchItems,
} from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';

@Injectable()
export class InvoicesService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async list(user: AuthUser) {
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
      clientCode: clients.code,
    })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.companyId, user.companyId))
      .orderBy(desc(invoices.createdAt));
  }

  async getById(user: AuthUser, id: string) {
    const [invoice] = await this.db.select().from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, user.companyId))).limit(1);
    if (!invoice) throw new NotFoundException('Factura no encontrada');

    const items = await this.db.select({
      id: invoiceItems.id,
      productId: invoiceItems.productId,
      quantity: invoiceItems.quantity,
      unitPrice: invoiceItems.unitPrice,
      lineTotal: invoiceItems.lineTotal,
      dispatchedQty: invoiceItems.dispatchedQty,
      productName: products.name,
      productSku: products.sku,
    })
      .from(invoiceItems)
      .innerJoin(products, eq(invoiceItems.productId, products.id))
      .where(eq(invoiceItems.invoiceId, id));

    const payments = await this.db.select().from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, id));

    const [client] = await this.db.select().from(clients).where(eq(clients.id, invoice.clientId)).limit(1);

    return { ...invoice, client, clientName: client?.name, items, payments };
  }

  async create(user: AuthUser, data: {
    clientId: string;
    invoiceType: 'cash' | 'credit';
    items: { productId: string; quantity: number; unitPrice: number; warehouseId?: string }[];
    dueDate?: string;
    notes?: string;
    issue?: boolean;
  }) {
    const reference = `FAC-${Date.now().toString(36).toUpperCase()}`;
    let subtotal = 0;
    const lineItems = data.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      return { ...item, lineTotal };
    });

    const [client] = await this.db.select().from(clients)
      .where(and(eq(clients.id, data.clientId), eq(clients.companyId, user.companyId))).limit(1);
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const dueDate = data.invoiceType === 'credit'
      ? new Date(Date.now() + (client.creditDays ?? 30) * 86400000)
      : data.dueDate ? new Date(data.dueDate) : null;

    const [invoice] = await this.db.insert(invoices).values({
      companyId: user.companyId,
      clientId: data.clientId,
      reference,
      invoiceType: data.invoiceType,
      status: data.issue ? 'issued' : 'draft',
      subtotal: subtotal.toFixed(2),
      totalAmount: subtotal.toFixed(2),
      dueDate,
      issuedAt: data.issue ? new Date() : null,
      notes: data.notes,
      createdById: user.userId,
    }).returning();

    for (const item of lineItems) {
      const [invItem] = await this.db.insert(invoiceItems).values({
        invoiceId: invoice.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        lineTotal: item.lineTotal.toFixed(2),
        warehouseId: item.warehouseId,
      }).returning();

      if (data.issue) {
        await this.reserveStock(user.companyId, item.productId, item.quantity, item.warehouseId);
        await this.db.insert(clientAllocations).values({
          companyId: user.companyId,
          clientId: data.clientId,
          invoiceItemId: invItem.id,
          productId: item.productId,
          allocatedQty: item.quantity,
          pendingQty: item.quantity,
          warehouseId: item.warehouseId,
        });
      }
    }

    return this.getById(user, invoice.id);
  }

  async addPayment(user: AuthUser, invoiceId: string, data: {
    amount: number; method?: string; reference?: string; notes?: string;
  }) {
    const invoice = await this.getById(user, invoiceId);
    const paid = parseFloat(invoice.paidAmount ?? '0') + data.amount;
    const total = parseFloat(invoice.totalAmount ?? '0');

    await this.db.insert(invoicePayments).values({
      invoiceId,
      amount: data.amount.toFixed(2),
      method: data.method ?? 'transfer',
      reference: data.reference,
      notes: data.notes,
      recordedById: user.userId,
    });

    let status = invoice.status;
    if (paid >= total) status = 'paid';
    else if (paid > 0) status = 'partially_paid';

    await this.db.update(invoices).set({
      paidAmount: paid.toFixed(2),
      status,
      updatedAt: new Date(),
    }).where(eq(invoices.id, invoiceId));

    return this.getById(user, invoiceId);
  }

  private async reserveStock(companyId: string, productId: string, qty: number, warehouseId?: string) {
    const conditions = [eq(stockLevels.companyId, companyId), eq(stockLevels.productId, productId)];
    if (warehouseId) conditions.push(eq(stockLevels.warehouseId, warehouseId));

    const [stock] = await this.db.select().from(stockLevels).where(and(...conditions)).limit(1);
    if (!stock) throw new NotFoundException('Stock no encontrado');

    const available = stock.totalQty - stock.reservedQty - stock.dispatchedQty;
    if (available < qty) throw new NotFoundException(`Stock insuficiente (disponible: ${available})`);

    await this.db.update(stockLevels).set({
      reservedQty: stock.reservedQty + qty,
      updatedAt: new Date(),
    }).where(eq(stockLevels.id, stock.id));
  }
}

@Injectable()
export class DispatchesService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async create(user: AuthUser, data: {
    clientId: string;
    invoiceId?: string;
    items: { invoiceItemId: string; quantity: number }[];
    notes?: string;
  }) {
    const reference = `DES-${Date.now().toString(36).toUpperCase()}`;

    const [dispatch] = await this.db.insert(dispatches).values({
      companyId: user.companyId,
      clientId: data.clientId,
      invoiceId: data.invoiceId,
      reference,
      status: 'completed',
      dispatchedAt: new Date(),
      notes: data.notes,
      createdById: user.userId,
    }).returning();

    for (const item of data.items) {
      const [invItem] = await this.db.select().from(invoiceItems)
        .where(eq(invoiceItems.id, item.invoiceItemId)).limit(1);
      if (!invItem) continue;

      const pending = invItem.quantity - invItem.dispatchedQty;
      if (item.quantity > pending) {
        throw new NotFoundException(`Cantidad excede pendiente (${pending}) para item ${invItem.id}`);
      }

      await this.db.insert(dispatchItems).values({
        dispatchId: dispatch.id,
        invoiceItemId: item.invoiceItemId,
        productId: invItem.productId,
        quantity: item.quantity,
        warehouseId: invItem.warehouseId,
      });

      await this.db.update(invoiceItems).set({
        dispatchedQty: invItem.dispatchedQty + item.quantity,
      }).where(eq(invoiceItems.id, item.invoiceItemId));

      const [alloc] = await this.db.select().from(clientAllocations)
        .where(eq(clientAllocations.invoiceItemId, item.invoiceItemId)).limit(1);
      if (alloc) {
        const newPending = alloc.pendingQty - item.quantity;
        await this.db.update(clientAllocations).set({
          dispatchedQty: alloc.dispatchedQty + item.quantity,
          pendingQty: newPending,
          status: newPending <= 0 ? 'dispatched' : 'partially_dispatched',
          updatedAt: new Date(),
        }).where(eq(clientAllocations.id, alloc.id));
      }

      const [stock] = await this.db.select().from(stockLevels)
        .where(and(
          eq(stockLevels.companyId, user.companyId),
          eq(stockLevels.productId, invItem.productId),
          invItem.warehouseId ? eq(stockLevels.warehouseId, invItem.warehouseId) : sql`true`,
        )).limit(1);
      if (stock) {
        await this.db.update(stockLevels).set({
          reservedQty: Math.max(0, stock.reservedQty - item.quantity),
          dispatchedQty: stock.dispatchedQty + item.quantity,
          updatedAt: new Date(),
        }).where(eq(stockLevels.id, stock.id));
      }
    }

    return dispatch;
  }

  async listPending(user: AuthUser) {
    return this.db.select({
      id: clientAllocations.id,
      invoiceItemId: clientAllocations.invoiceItemId,
      clientId: clientAllocations.clientId,
      clientName: clients.name,
      productName: products.name,
      productSku: products.sku,
      allocatedQty: clientAllocations.allocatedQty,
      dispatchedQty: clientAllocations.dispatchedQty,
      pendingQty: clientAllocations.pendingQty,
      status: clientAllocations.status,
    })
      .from(clientAllocations)
      .innerJoin(clients, eq(clientAllocations.clientId, clients.id))
      .innerJoin(products, eq(clientAllocations.productId, products.id))
      .where(and(
        eq(clientAllocations.companyId, user.companyId),
        sql`${clientAllocations.pendingQty} > 0`,
      ))
      .orderBy(desc(clientAllocations.updatedAt));
  }

  async listAll(user: AuthUser) {
    const rows = await this.db.select({
      id: dispatches.id,
      reference: dispatches.reference,
      status: dispatches.status,
      dispatchedAt: dispatches.dispatchedAt,
      notes: dispatches.notes,
      clientName: clients.name,
      invoiceReference: invoices.reference,
    })
      .from(dispatches)
      .innerJoin(clients, eq(dispatches.clientId, clients.id))
      .leftJoin(invoices, eq(dispatches.invoiceId, invoices.id))
      .where(eq(dispatches.companyId, user.companyId))
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
}
