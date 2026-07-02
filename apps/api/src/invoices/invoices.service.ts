import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import {
  clients, invoices, invoiceItems, invoicePayments, clientAllocations,
  stockLevels, products, dispatches, dispatchItems,
} from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';
import { FiscalService } from '../fiscal/fiscal.service';
import {
  ComprobanteType, MODIFICATION_TYPES, calculateTaxTotals,
  suggestComprobanteType, validateComprobanteForClient, DEFAULT_ITBIS_RATE,
} from '../fiscal/fiscal.util';

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private fiscalService: FiscalService,
  ) {}

  async list(user: AuthUser) {
    return this.db.select({
      id: invoices.id,
      reference: invoices.reference,
      ncf: invoices.ncf,
      comprobanteType: invoices.comprobanteType,
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

    let relatedInvoice = null;
    if (invoice.relatedInvoiceId) {
      const [rel] = await this.db.select({
        id: invoices.id, reference: invoices.reference, ncf: invoices.ncf,
      }).from(invoices).where(eq(invoices.id, invoice.relatedInvoiceId)).limit(1);
      relatedInvoice = rel ?? null;
    }

    return { ...invoice, client, clientName: client?.name, items, payments, relatedInvoice };
  }

  async create(user: AuthUser, data: {
    clientId: string;
    invoiceType: 'cash' | 'credit';
    comprobanteType?: ComprobanteType;
    itbisRate?: number;
    items: { productId: string; quantity: number; unitPrice: number; warehouseId?: string }[];
    dueDate?: string;
    notes?: string;
    issue?: boolean;
    relatedInvoiceId?: string;
    modificationReason?: string;
  }) {
    const [client] = await this.db.select().from(clients)
      .where(and(eq(clients.id, data.clientId), eq(clients.companyId, user.companyId))).limit(1);
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const comprobanteType = data.comprobanteType ?? suggestComprobanteType(client.taxId, data.invoiceType);
    const validationError = validateComprobanteForClient(comprobanteType, client.taxId);
    if (validationError) throw new BadRequestException(validationError);

    if (MODIFICATION_TYPES.includes(comprobanteType) && !data.relatedInvoiceId) {
      throw new BadRequestException('Las notas de débito/crédito requieren la factura de referencia');
    }

    let relatedInvoice = null;
    if (data.relatedInvoiceId) {
      relatedInvoice = await this.getById(user, data.relatedInvoiceId);
      if (!['B01', 'B02', 'B14'].includes(relatedInvoice.comprobanteType)) {
        throw new BadRequestException('Solo se pueden modificar facturas válidas (B01, B02, B14)');
      }
    }

    const reference = comprobanteType === 'B04'
      ? `NCR-${Date.now().toString(36).toUpperCase()}`
      : comprobanteType === 'B03'
        ? `NDB-${Date.now().toString(36).toUpperCase()}`
        : `FAC-${Date.now().toString(36).toUpperCase()}`;

    let subtotal = 0;
    const lineItems = data.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      return { ...item, lineTotal };
    });

    const itbisRate = data.itbisRate ?? DEFAULT_ITBIS_RATE;
    const totals = calculateTaxTotals(subtotal, itbisRate);

    const dueDate = data.invoiceType === 'credit'
      ? new Date(Date.now() + (client.creditDays ?? 30) * 86400000)
      : data.dueDate ? new Date(data.dueDate) : null;

    let ncf: string | null = null;
    if (data.issue) {
      ncf = await this.fiscalService.allocateNcf(user, comprobanteType);
    }

    const [invoice] = await this.db.insert(invoices).values({
      companyId: user.companyId,
      clientId: data.clientId,
      reference,
      ncf,
      comprobanteType,
      invoiceType: data.invoiceType,
      status: data.issue ? 'issued' : 'draft',
      subtotal: totals.subtotal.toFixed(2),
      taxAmount: totals.taxAmount.toFixed(2),
      itbisRate: itbisRate.toFixed(2),
      totalAmount: totals.totalAmount.toFixed(2),
      dueDate,
      issuedAt: data.issue ? new Date() : null,
      notes: data.notes,
      relatedInvoiceId: data.relatedInvoiceId ?? null,
      modificationReason: data.modificationReason ?? null,
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

      if (data.issue && !MODIFICATION_TYPES.includes(comprobanteType)) {
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

    if (data.issue && comprobanteType === 'B04' && relatedInvoice) {
      const creditTotal = totals.totalAmount;
      const newTotal = Math.max(0, parseFloat(relatedInvoice.totalAmount ?? '0') - creditTotal);
      const paid = parseFloat(relatedInvoice.paidAmount ?? '0');
      let status = relatedInvoice.status;
      if (newTotal <= 0) status = 'cancelled';
      else if (paid >= newTotal) status = 'paid';
      else if (paid > 0) status = 'partially_paid';
      else status = 'issued';
      await this.db.update(invoices).set({
        totalAmount: newTotal.toFixed(2),
        status,
        updatedAt: new Date(),
      }).where(eq(invoices.id, relatedInvoice.id));
    }

    if (data.issue && comprobanteType === 'B03' && relatedInvoice) {
      const debitTotal = totals.totalAmount;
      const newTotal = parseFloat(relatedInvoice.totalAmount ?? '0') + debitTotal;
      const paid = parseFloat(relatedInvoice.paidAmount ?? '0');
      let status = relatedInvoice.status;
      if (paid >= newTotal) status = 'paid';
      else if (paid > 0) status = 'partially_paid';
      else status = 'issued';
      await this.db.update(invoices).set({
        totalAmount: newTotal.toFixed(2),
        status,
        updatedAt: new Date(),
      }).where(eq(invoices.id, relatedInvoice.id));
    }

    return this.getById(user, invoice.id);
  }

  async createCreditNote(user: AuthUser, invoiceId: string, data: {
    items?: { productId: string; quantity: number; unitPrice: number }[];
    modificationReason: string;
    notes?: string;
  }) {
    const original = await this.getById(user, invoiceId);
    if (!['B01', 'B02', 'B14'].includes(original.comprobanteType)) {
      throw new BadRequestException('Solo se emiten notas de crédito sobre facturas B01, B02 o B14');
    }

    const items = data.items?.length
      ? data.items
      : (original.items ?? []).map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unitPrice),
      }));

    return this.create(user, {
      clientId: original.clientId,
      invoiceType: original.invoiceType,
      comprobanteType: 'B04',
      itbisRate: parseFloat(original.itbisRate ?? '18'),
      items,
      issue: true,
      relatedInvoiceId: invoiceId,
      modificationReason: data.modificationReason,
      notes: data.notes,
    });
  }

  async createDebitNote(user: AuthUser, invoiceId: string, data: {
    items: { productId: string; quantity: number; unitPrice: number }[];
    modificationReason: string;
    notes?: string;
  }) {
    const original = await this.getById(user, invoiceId);
    if (!['B01', 'B02', 'B14'].includes(original.comprobanteType)) {
      throw new BadRequestException('Solo se emiten notas de débito sobre facturas B01, B02 o B14');
    }

    return this.create(user, {
      clientId: original.clientId,
      invoiceType: original.invoiceType,
      comprobanteType: 'B03',
      itbisRate: parseFloat(original.itbisRate ?? '18'),
      items: data.items,
      issue: true,
      relatedInvoiceId: invoiceId,
      modificationReason: data.modificationReason,
      notes: data.notes,
    });
  }

  async addPayment(user: AuthUser, invoiceId: string, data: {
    amount: number; method?: string; reference?: string; notes?: string;
  }) {
    const invoice = await this.getById(user, invoiceId);
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('El monto del abono debe ser mayor a cero');
    }
    const currentPaid = parseFloat(invoice.paidAmount ?? '0');
    const total = parseFloat(invoice.totalAmount ?? '0');
    const balance = Math.max(0, total - currentPaid);
    if (data.amount > balance + 0.01) {
      throw new BadRequestException(`El monto excede el saldo pendiente (RD$ ${balance.toFixed(2)})`);
    }
    const paid = currentPaid + data.amount;

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

  async voidPayment(user: AuthUser, invoiceId: string, paymentId: string) {
    const invoice = await this.getById(user, invoiceId);
    const payment = (invoice.payments ?? []).find((p: any) => p.id === paymentId);
    if (!payment) throw new NotFoundException('Pago no encontrado');

    await this.db.delete(invoicePayments).where(eq(invoicePayments.id, paymentId));

    const total = parseFloat(invoice.totalAmount ?? '0');
    const paid = Math.max(0, parseFloat(invoice.paidAmount ?? '0') - parseFloat(payment.amount));
    let status = invoice.status;
    if (status !== 'cancelled' && status !== 'draft') {
      if (paid <= 0) status = 'issued';
      else if (paid >= total) status = 'paid';
      else status = 'partially_paid';
    }

    await this.db.update(invoices).set({
      paidAmount: paid.toFixed(2),
      status,
      updatedAt: new Date(),
    }).where(eq(invoices.id, invoiceId));

    return this.getById(user, invoiceId);
  }

  async listPayments(user: AuthUser, filters: { clientId?: string; method?: string; from?: string; to?: string } = {}) {
    const conditions = [eq(invoices.companyId, user.companyId)];
    if (filters.clientId) conditions.push(eq(invoices.clientId, filters.clientId));
    if (filters.method) conditions.push(eq(invoicePayments.method, filters.method as any));
    if (filters.from) conditions.push(gte(invoicePayments.paidAt, new Date(filters.from)));
    if (filters.to) conditions.push(lte(invoicePayments.paidAt, new Date(`${filters.to}T23:59:59`)));

    return this.db.select({
      id: invoicePayments.id,
      amount: invoicePayments.amount,
      method: invoicePayments.method,
      reference: invoicePayments.reference,
      notes: invoicePayments.notes,
      paidAt: invoicePayments.paidAt,
      invoiceId: invoices.id,
      invoiceReference: invoices.reference,
      clientId: clients.id,
      clientName: clients.name,
      clientPhone: clients.phone,
    })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(invoicePayments.paidAt));
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
