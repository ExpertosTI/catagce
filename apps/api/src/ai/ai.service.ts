import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, inArray, isNotNull, sql } from 'drizzle-orm';
import { invoices, clients, clientAllocations, stockLevels, companies } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';
import { generateWithGemini, isAiConfigured } from './gemini.util';
import { formatCurrency } from '../common/format-currency';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class AiService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async staffChat(user: AuthUser, message: string, history: ChatMessage[] = []) {
    const context = await this.buildStaffContext(user);

    if (!isAiConfigured()) {
      return {
        reply: this.staffFallbackReply(message, context),
        aiEnabled: false,
      };
    }

    const systemInstruction = `Eres el asistente inteligente de GHome, un panel de administración de importación y ventas en Santo Domingo, República Dominicana. Respondes en español, de forma breve, clara y profesional, con montos siempre en pesos dominicanos (RD$). Tienes acceso a datos reales de la empresa que se te dan como contexto. Si el usuario pide una acción que no puedes ejecutar directamente (como crear o borrar algo), explica cómo hacerlo desde el panel (por ejemplo indicando la sección) en vez de inventar que ya se hizo.\n\nContexto actual de la empresa (JSON):\n${JSON.stringify(context)}`;

    const historyText = history.slice(-6).map((h) => `${h.role === 'user' ? 'Usuario' : 'Asistente'}: ${h.content}`).join('\n');
    const prompt = `${historyText ? `${historyText}\n` : ''}Usuario: ${message}\nAsistente:`;

    const reply = await generateWithGemini(prompt, systemInstruction);
    return {
      reply: reply ?? this.staffFallbackReply(message, context),
      aiEnabled: Boolean(reply),
    };
  }

  async clientChat(user: AuthUser, message: string, history: ChatMessage[] = [], clientContext?: Record<string, unknown>) {
    const context = clientContext ?? await this.buildClientContext(user);

    if (!isAiConfigured()) {
      return {
        reply: this.clientFallbackReply(message, context),
        aiEnabled: false,
      };
    }

    const systemInstruction = `Eres el asistente virtual de atención al cliente de "${context.companyName ?? 'la empresa'}" en Santo Domingo, República Dominicana. Ayudas al cliente ${context.clientName ?? ''} con preguntas sobre sus facturas, saldos y pedidos. Responde en español, de forma breve y amable, con montos en pesos dominicanos (RD$). Solo puedes ver los datos del propio cliente, nunca inventes datos de otros clientes.\n\nDatos del cliente (JSON):\n${JSON.stringify(context)}`;

    const historyText = history.slice(-6).map((h) => `${h.role === 'user' ? 'Cliente' : 'Asistente'}: ${h.content}`).join('\n');
    const prompt = `${historyText ? `${historyText}\n` : ''}Cliente: ${message}\nAsistente:`;

    const reply = await generateWithGemini(prompt, systemInstruction);
    return {
      reply: reply ?? this.clientFallbackReply(message, context),
      aiEnabled: Boolean(reply),
    };
  }

  private async buildStaffContext(user: AuthUser) {
    const overdueRows = await this.db.select({
      reference: invoices.reference,
      clientName: clients.name,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      dueDate: invoices.dueDate,
    })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.companyId, user.companyId), inArray(invoices.status, ['overdue'])))
      .orderBy(desc(invoices.dueDate))
      .limit(10);

    const dueSoonRows = await this.db.select({
      reference: invoices.reference,
      clientName: clients.name,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      dueDate: invoices.dueDate,
    })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(
        eq(invoices.companyId, user.companyId),
        inArray(invoices.status, ['issued', 'partially_paid']),
        isNotNull(invoices.dueDate),
      ))
      .orderBy(invoices.dueDate)
      .limit(10);

    const [pendingDispatch] = await this.db.select({
      count: sql<number>`COUNT(*)::int`,
      units: sql<number>`COALESCE(SUM(${clientAllocations.pendingQty}), 0)::int`,
    }).from(clientAllocations)
      .where(and(eq(clientAllocations.companyId, user.companyId), sql`${clientAllocations.pendingQty} > 0`));

    const [stock] = await this.db.select({
      available: sql<number>`COALESCE(SUM(${stockLevels.totalQty} - ${stockLevels.reservedQty} - ${stockLevels.dispatchedQty}), 0)::int`,
    }).from(stockLevels).where(eq(stockLevels.companyId, user.companyId));

    return {
      overdueInvoices: overdueRows.map((r: any) => ({
        reference: r.reference,
        cliente: r.clientName,
        saldo: formatCurrency(parseFloat(r.totalAmount) - parseFloat(r.paidAmount)),
        vencimiento: r.dueDate,
      })),
      facturasPorVencer: dueSoonRows.map((r: any) => ({
        reference: r.reference,
        cliente: r.clientName,
        saldo: formatCurrency(parseFloat(r.totalAmount) - parseFloat(r.paidAmount)),
        vencimiento: r.dueDate,
      })),
      despachosPendientes: pendingDispatch,
      unidadesDisponiblesEnAlmacen: stock?.available ?? 0,
    };
  }

  private async buildClientContext(user: AuthUser) {
    const invoiceRows = await this.db.select({
      reference: invoices.reference,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      dueDate: invoices.dueDate,
    })
      .from(invoices)
      .where(and(eq(invoices.companyId, user.companyId), eq(invoices.clientId, user.userId)))
      .orderBy(desc(invoices.createdAt))
      .limit(15);

    const balanceDue = invoiceRows.reduce(
      (sum: number, r: any) => sum + Math.max(0, parseFloat(r.totalAmount) - parseFloat(r.paidAmount)), 0,
    );

    const [company] = await this.db.select({ name: companies.name }).from(companies)
      .where(eq(companies.id, user.companyId)).limit(1);

    return {
      clientName: user.name,
      companyName: company?.name,
      facturas: invoiceRows.map((r: any) => ({
        reference: r.reference,
        estado: r.status,
        saldo: formatCurrency(parseFloat(r.totalAmount) - parseFloat(r.paidAmount)),
        vencimiento: r.dueDate,
      })),
      balanceTotalPendiente: formatCurrency(balanceDue),
    };
  }

  private staffFallbackReply(message: string, context: any) {
    const q = message.toLowerCase();
    if (q.includes('vencid') || q.includes('atras')) {
      if (!context.overdueInvoices.length) return 'No hay facturas vencidas en este momento. ¡Buen trabajo!';
      const list = context.overdueInvoices.map((i: any) => `• ${i.reference} — ${i.cliente} — ${i.saldo}`).join('\n');
      return `Facturas vencidas:\n${list}\n\n(Nota: para respuestas más completas active GEMINI_API_KEY en el servidor)`;
    }
    if (q.includes('por vencer') || q.includes('vence')) {
      if (!context.facturasPorVencer.length) return 'No hay facturas por vencer próximamente.';
      const list = context.facturasPorVencer.slice(0, 5).map((i: any) => `• ${i.reference} — ${i.cliente} — ${i.saldo}`).join('\n');
      return `Facturas próximas a vencer:\n${list}`;
    }
    if (q.includes('despacho') || q.includes('pendiente')) {
      return `Despachos pendientes: ${context.despachosPendientes?.count ?? 0} (${context.despachosPendientes?.units ?? 0} unidades). Unidades disponibles en almacén: ${context.unidadesDisponiblesEnAlmacen}.`;
    }
    return 'Puedo ayudarle con información sobre facturas vencidas, por vencer, despachos pendientes e inventario. Para respuestas más naturales, configure GEMINI_API_KEY en el servidor.';
  }

  private clientFallbackReply(message: string, context: any) {
    const q = message.toLowerCase();
    if (q.includes('saldo') || q.includes('debo') || q.includes('pendiente')) {
      return `Su saldo total pendiente es ${context.balanceTotalPendiente}.`;
    }
    if (q.includes('factura')) {
      if (!context.facturas?.length) return 'No tiene facturas registradas todavía.';
      const list = context.facturas.slice(0, 5).map((i: any) => `• ${i.reference} — ${i.saldo}`).join('\n');
      return `Sus facturas recientes:\n${list}`;
    }
    return `Hola ${context.clientName ?? ''}, puedo ayudarle con información sobre sus facturas y saldo pendiente. Escriba por ejemplo "¿cuál es mi saldo?".`;
  }
}
