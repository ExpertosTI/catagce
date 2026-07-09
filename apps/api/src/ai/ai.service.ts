import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, inArray, isNotNull, sql } from 'drizzle-orm';
import { invoices, clients, clientAllocations, stockLevels, companies, invoicePayments } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';
import { generateWithGemini, isAiConfigured } from './gemini.util';
import { generateWithTools, turnsToContents, type GeminiContent } from './gemini-tools.util';
import { getCompanyGeminiKey } from './company-ai.util';
import { formatCurrency } from '../common/format-currency';
import { formatDate } from '../common/format-date';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CommerceNotifyService } from '../whatsapp/commerce-notify.service';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

@Injectable()
export class AiService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private whatsapp: WhatsAppService,
    private commerceNotify: CommerceNotifyService,
  ) {}

  async staffChat(user: AuthUser, message: string, history: ChatMessage[] = []) {
    const context: Record<string, unknown> = await this.buildStaffContext(user);

    const mentionedClient = await this.findMentionedClient(user, message);
    if (mentionedClient) {
      context.clienteConsultado = await this.buildClientStatement(user, mentionedClient.id, mentionedClient.name);
    }

    const geminiKey = await getCompanyGeminiKey(this.db, user.companyId);
    if (!isAiConfigured(geminiKey)) {
      return {
        reply: this.staffFallbackReply(message, context),
        aiEnabled: false,
      };
    }

    const toolReply = await this.staffChatWithTools(user, message, history, context, geminiKey);
    if (toolReply) {
      return { reply: toolReply, aiEnabled: true, whatsappEnabled: this.whatsapp.evolutionConfigured() };
    }

    const systemInstruction = `Eres el asistente inteligente de GHome, un panel de administración de importación y ventas en Santo Domingo, República Dominicana. Respondes en español, de forma breve, clara y profesional, con montos siempre en pesos dominicanos (RD$). Tienes acceso a datos reales de la empresa que se te dan como contexto, incluyendo facturas, pagos recientes, deudores principales y — si el mensaje menciona a un cliente — su estado de cuenta detallado (clienteConsultado). Si el usuario pide una acción que no puedes ejecutar directamente (como crear o borrar algo), explica cómo hacerlo desde el panel (por ejemplo indicando la sección) en vez de inventar que ya se hizo.\n\nContexto actual de la empresa (JSON):\n${JSON.stringify(context)}`;

    const historyText = history.slice(-6).map((h) => `${h.role === 'user' ? 'Usuario' : 'Asistente'}: ${h.content}`).join('\n');
    const prompt = `${historyText ? `${historyText}\n` : ''}Usuario: ${message}\nAsistente:`;

    const reply = await generateWithGemini(prompt, systemInstruction, geminiKey);
    return {
      reply: reply ?? this.staffFallbackReply(message, context),
      aiEnabled: Boolean(reply),
      whatsappEnabled: this.whatsapp.evolutionConfigured(),
    };
  }

  private async staffChatWithTools(
    user: AuthUser,
    message: string,
    history: ChatMessage[],
    context: Record<string, unknown>,
    geminiKey: string | null,
  ): Promise<string | null> {
    const tools = [
      {
        name: 'get_business_snapshot',
        description: 'KPIs de facturas vencidas, por vencer, despachos, inventario y deudores.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'list_recent_orders',
        description: 'Pedidos/preventas recientes del catálogo.',
        parameters: {
          type: 'object',
          properties: { limit: { type: 'number', description: 'Máximo de filas (default 8)' } },
        },
      },
      {
        name: 'send_whatsapp_admin',
        description: 'Envía un mensaje WhatsApp al equipo/admin con un reporte o alerta.',
        parameters: {
          type: 'object',
          properties: { message: { type: 'string', description: 'Cuerpo del mensaje' } },
          required: ['message'],
        },
      },
      {
        name: 'share_catalog_whatsapp',
        description: 'Envía un catálogo público por WhatsApp a un número de cliente.',
        parameters: {
          type: 'object',
          properties: {
            catalogId: { type: 'string' },
            phone: { type: 'string' },
            recipientName: { type: 'string' },
          },
          required: ['catalogId', 'phone'],
        },
      },
    ];

    const systemInstruction = `Eres Super AI de GHome — copiloto de operaciones con herramientas reales.
- Responde en español, breve y profesional (montos en RD$).
- Usa get_business_snapshot o list_recent_orders antes de reportes.
- Usa send_whatsapp_admin solo cuando el usuario pida explícitamente notificar o enviar un reporte por WhatsApp.
- Usa share_catalog_whatsapp cuando pidan compartir un catálogo por WhatsApp (necesitas catalogId y teléfono).
- No inventes datos; usa las herramientas.
Contexto JSON: ${JSON.stringify(context).slice(0, 6000)}`;

    const contents: GeminiContent[] = [
      ...turnsToContents(history.slice(-6)),
      { role: 'user', parts: [{ text: message }] },
    ];

    for (let i = 0; i < 5; i++) {
      const result = await generateWithTools(contents, { systemInstruction, tools, apiKey: geminiKey });
      if (!result.ok) return null;

      if (result.functionCall) {
        const fn = result.functionCall;
        const toolResult = await this.runStaffTool(user, fn.name, fn.args || {});
        contents.push({ role: 'model', parts: [{ functionCall: fn }] });
        contents.push({
          role: 'user',
          parts: [{ functionResponse: { name: fn.name, response: toolResult } }],
        });
        continue;
      }

      if (result.text) return result.text;
      return null;
    }
    return null;
  }

  private async runStaffTool(user: AuthUser, name: string, args: Record<string, unknown>) {
    if (name === 'get_business_snapshot') {
      const ctx = await this.buildStaffContext(user);
      return ctx;
    }
    if (name === 'list_recent_orders') {
      const limit = Math.min(20, Math.max(1, Number(args.limit) || 8));
      return this.commerceNotify.recentOrdersSummary(user.companyId, limit);
    }
    if (name === 'send_whatsapp_admin') {
      const text = String(args.message || '').trim().slice(0, 3500);
      if (!text) return { ok: false, error: 'empty_message' };
      if (!this.whatsapp.evolutionConfigured()) return { ok: false, error: 'evolution_not_configured' };
      const admin = await this.whatsapp.adminPhoneStatus(user.companyId);
      if (!admin.configured) {
        return { ok: false, error: 'admin_phone_missing', hint: 'Configure el WhatsApp del negocio en Ajustes → Datos de la empresa' };
      }
      return this.whatsapp.sendAdmin(user.companyId, text);
    }
    if (name === 'share_catalog_whatsapp') {
      const catalogId = String(args.catalogId || '');
      const phone = String(args.phone || '');
      const recipientName = args.recipientName ? String(args.recipientName) : undefined;
      if (!catalogId || !phone) return { ok: false, error: 'invalid_request' };
      return this.commerceNotify.shareCatalog(user.companyId, catalogId, phone, recipientName);
    }
    return { error: 'unknown_tool' };
  }

  async clientChat(user: AuthUser, message: string, history: ChatMessage[] = [], clientContext?: Record<string, unknown>) {
    const context = clientContext ?? await this.buildClientContext(user);

    const geminiKey = await getCompanyGeminiKey(this.db, user.companyId);
    if (!isAiConfigured(geminiKey)) {
      return {
        reply: this.clientFallbackReply(message, context),
        aiEnabled: false,
      };
    }

    const systemInstruction = `Eres el asistente virtual de atención al cliente de "${context.companyName ?? 'la empresa'}" en Santo Domingo, República Dominicana. Ayudas al cliente ${context.clientName ?? ''} con preguntas sobre sus facturas, pagos, estado de cuenta y saldos. Responde en español, de forma breve y amable, con montos en pesos dominicanos (RD$). Tienes acceso a su historial de facturas (facturas), pagos (pagos) y un resumen (resumenCuenta) con totales facturados/pagados y próximo vencimiento. Solo puedes ver los datos del propio cliente, nunca inventes datos de otros clientes.\n\nDatos del cliente (JSON):\n${JSON.stringify(context)}`;

    const historyText = history.slice(-6).map((h) => `${h.role === 'user' ? 'Cliente' : 'Asistente'}: ${h.content}`).join('\n');
    const prompt = `${historyText ? `${historyText}\n` : ''}Cliente: ${message}\nAsistente:`;

    const reply = await generateWithGemini(prompt, systemInstruction, geminiKey);
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

    const recentPaymentRows = await this.db.select({
      amount: invoicePayments.amount,
      method: invoicePayments.method,
      paidAt: invoicePayments.paidAt,
      reference: invoices.reference,
      clientName: clients.name,
    })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.companyId, user.companyId))
      .orderBy(desc(invoicePayments.paidAt))
      .limit(10);

    const debtorRows = await this.db.select({
      clientName: clients.name,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
    })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.companyId, user.companyId), inArray(invoices.status, ['issued', 'partially_paid', 'overdue'])));

    const debtByClient = new Map<string, number>();
    for (const r of debtorRows) {
      const balance = parseFloat(r.totalAmount) - parseFloat(r.paidAmount);
      if (balance <= 0) continue;
      debtByClient.set(r.clientName, (debtByClient.get(r.clientName) ?? 0) + balance);
    }
    const topDebtors = [...debtByClient.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cliente, saldo]) => ({ cliente, saldo: formatCurrency(saldo) }));

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
      pagosRecientes: recentPaymentRows.map((p: any) => ({
        cliente: p.clientName,
        factura: p.reference,
        monto: formatCurrency(p.amount),
        metodo: p.method,
        fecha: formatDate(p.paidAt),
      })),
      principalesDeudores: topDebtors,
    };
  }

  private async findMentionedClient(user: AuthUser, message: string) {
    const q = message.toLowerCase();
    if (q.length < 4) return null;
    const rows = await this.db.select({ id: clients.id, name: clients.name })
      .from(clients).where(eq(clients.companyId, user.companyId));
    return rows.find((c: any) => c.name && q.includes(c.name.toLowerCase())) ?? null;
  }

  private async buildClientStatement(user: AuthUser, clientId: string, clientName: string) {
    const invoiceRows = await this.db.select({
      reference: invoices.reference,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      dueDate: invoices.dueDate,
      issuedAt: invoices.issuedAt,
    })
      .from(invoices)
      .where(and(eq(invoices.companyId, user.companyId), eq(invoices.clientId, clientId)))
      .orderBy(desc(invoices.issuedAt))
      .limit(20);

    const paymentRows = await this.db.select({
      amount: invoicePayments.amount,
      method: invoicePayments.method,
      paidAt: invoicePayments.paidAt,
      reference: invoices.reference,
    })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .where(and(eq(invoices.companyId, user.companyId), eq(invoices.clientId, clientId)))
      .orderBy(desc(invoicePayments.paidAt))
      .limit(15);

    const balanceDue = invoiceRows.reduce(
      (sum: number, r: any) => sum + Math.max(0, parseFloat(r.totalAmount) - parseFloat(r.paidAmount)), 0,
    );

    return {
      nombre: clientName,
      saldoTotalPendiente: formatCurrency(balanceDue),
      facturas: invoiceRows.map((r: any) => ({
        reference: r.reference,
        estado: r.status,
        total: formatCurrency(r.totalAmount),
        saldo: formatCurrency(parseFloat(r.totalAmount) - parseFloat(r.paidAmount)),
        emitida: formatDate(r.issuedAt),
        vencimiento: r.dueDate ? formatDate(r.dueDate) : null,
      })),
      pagos: paymentRows.map((p: any) => ({
        factura: p.reference,
        monto: formatCurrency(p.amount),
        metodo: p.method,
        fecha: formatDate(p.paidAt),
      })),
    };
  }

  private async buildClientContext(user: AuthUser) {
    const invoiceRows = await this.db.select({
      reference: invoices.reference,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      dueDate: invoices.dueDate,
      issuedAt: invoices.issuedAt,
    })
      .from(invoices)
      .where(and(eq(invoices.companyId, user.companyId), eq(invoices.clientId, user.userId)))
      .orderBy(desc(invoices.createdAt))
      .limit(15);

    const paymentRows = await this.db.select({
      amount: invoicePayments.amount,
      method: invoicePayments.method,
      paidAt: invoicePayments.paidAt,
      reference: invoices.reference,
    })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .where(and(eq(invoices.companyId, user.companyId), eq(invoices.clientId, user.userId)))
      .orderBy(desc(invoicePayments.paidAt))
      .limit(15);

    const balanceDue = invoiceRows.reduce(
      (sum: number, r: any) => sum + Math.max(0, parseFloat(r.totalAmount) - parseFloat(r.paidAmount)), 0,
    );
    const totalFacturado = invoiceRows.reduce((sum: number, r: any) => sum + parseFloat(r.totalAmount), 0);
    const totalPagado = invoiceRows.reduce((sum: number, r: any) => sum + parseFloat(r.paidAmount), 0);
    const proximaFactura = invoiceRows
      .filter((r: any) => r.dueDate && parseFloat(r.totalAmount) - parseFloat(r.paidAmount) > 0)
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    const [company] = await this.db.select({ name: companies.name }).from(companies)
      .where(eq(companies.id, user.companyId)).limit(1);

    return {
      clientName: user.name,
      companyName: company?.name,
      facturas: invoiceRows.map((r: any) => ({
        reference: r.reference,
        estado: r.status,
        total: formatCurrency(r.totalAmount),
        saldo: formatCurrency(parseFloat(r.totalAmount) - parseFloat(r.paidAmount)),
        emitida: formatDate(r.issuedAt),
        vencimiento: r.dueDate ? formatDate(r.dueDate) : null,
      })),
      pagos: paymentRows.map((p: any) => ({
        factura: p.reference,
        monto: formatCurrency(p.amount),
        metodo: p.method,
        fecha: formatDate(p.paidAt),
      })),
      resumenCuenta: {
        totalFacturadoHistorico: formatCurrency(totalFacturado),
        totalPagadoHistorico: formatCurrency(totalPagado),
        balanceTotalPendiente: formatCurrency(balanceDue),
        proximoVencimiento: proximaFactura ? {
          factura: proximaFactura.reference,
          fecha: formatDate(proximaFactura.dueDate),
          saldo: formatCurrency(parseFloat(proximaFactura.totalAmount) - parseFloat(proximaFactura.paidAmount)),
        } : null,
      },
      balanceTotalPendiente: formatCurrency(balanceDue),
    };
  }

  private staffFallbackReply(message: string, context: any) {
    const q = message.toLowerCase();
    if (context.clienteConsultado) {
      const c = context.clienteConsultado;
      const facturas = c.facturas.slice(0, 5).map((i: any) => `• ${i.reference} (${i.estado}) — saldo ${i.saldo}${i.vencimiento ? `, vence ${i.vencimiento}` : ''}`).join('\n');
      const pagos = c.pagos.slice(0, 3).map((p: any) => `• ${p.fecha} — ${p.monto} (${p.metodo}) — Factura ${p.factura}`).join('\n');
      return `Estado de cuenta de ${c.nombre}:\nSaldo pendiente total: ${c.saldoTotalPendiente}\n\nFacturas:\n${facturas || 'Sin facturas'}\n\nÚltimos pagos:\n${pagos || 'Sin pagos registrados'}`;
    }
    if (q.includes('deb') && (q.includes('mas') || q.includes('más') || q.includes('mayor') || q.includes('quien') || q.includes('quién'))) {
      if (!context.principalesDeudores.length) return 'No hay clientes con saldo pendiente en este momento.';
      const list = context.principalesDeudores.map((d: any) => `• ${d.cliente} — ${d.saldo}`).join('\n');
      return `Principales deudores:\n${list}`;
    }
    if (q.includes('pago') || q.includes('abono') || q.includes('cobr')) {
      if (!context.pagosRecientes.length) return 'No se han registrado pagos recientemente.';
      const list = context.pagosRecientes.slice(0, 5).map((p: any) => `• ${p.fecha} — ${p.cliente} — ${p.monto} (${p.metodo}) — Factura ${p.factura}`).join('\n');
      return `Pagos recientes:\n${list}`;
    }
    if (q.includes('vencid') || q.includes('atras')) {
      if (!context.overdueInvoices.length) return 'No hay facturas vencidas en este momento. ¡Buen trabajo!';
      const list = context.overdueInvoices.map((i: any) => `• ${i.reference} — ${i.cliente} — ${i.saldo}`).join('\n');
      return `Facturas vencidas:\n${list}\n\n(Nota: para respuestas más naturales configure su API de Google en Ajustes → Super AI)`;
    }
    if (q.includes('por vencer') || q.includes('vence')) {
      if (!context.facturasPorVencer.length) return 'No hay facturas por vencer próximamente.';
      const list = context.facturasPorVencer.slice(0, 5).map((i: any) => `• ${i.reference} — ${i.cliente} — ${i.saldo}`).join('\n');
      return `Facturas próximas a vencer:\n${list}`;
    }
    if (q.includes('despacho') || q.includes('pendiente')) {
      return `Despachos pendientes: ${context.despachosPendientes?.count ?? 0} (${context.despachosPendientes?.units ?? 0} unidades). Unidades disponibles en almacén: ${context.unidadesDisponiblesEnAlmacen}.`;
    }
    return 'Puedo ayudarle con facturas vencidas o por vencer, pagos recientes, principales deudores, despachos pendientes, inventario, y el estado de cuenta de un cliente si menciona su nombre. Para respuestas más naturales, agregue su API de Google en Ajustes → Super AI.';
  }

  private clientFallbackReply(message: string, context: any) {
    const q = message.toLowerCase();
    if (q.includes('estado de cuenta') || q.includes('resumen')) {
      const r = context.resumenCuenta;
      return `Resumen de su cuenta:\nTotal facturado: ${r?.totalFacturadoHistorico}\nTotal pagado: ${r?.totalPagadoHistorico}\nSaldo pendiente: ${r?.balanceTotalPendiente}${r?.proximoVencimiento ? `\nPróximo vencimiento: factura ${r.proximoVencimiento.factura} el ${r.proximoVencimiento.fecha} por ${r.proximoVencimiento.saldo}` : ''}`;
    }
    if (q.includes('pago') || q.includes('abono')) {
      if (!context.pagos?.length) return 'No tiene pagos registrados todavía.';
      const list = context.pagos.slice(0, 5).map((p: any) => `• ${p.fecha} — ${p.monto} (${p.metodo}) — Factura ${p.factura}`).join('\n');
      return `Sus últimos pagos:\n${list}`;
    }
    if (q.includes('saldo') || q.includes('debo') || q.includes('pendiente')) {
      return `Su saldo total pendiente es ${context.balanceTotalPendiente}.`;
    }
    if (q.includes('factura')) {
      if (!context.facturas?.length) return 'No tiene facturas registradas todavía.';
      const list = context.facturas.slice(0, 5).map((i: any) => `• ${i.reference} — ${i.saldo}`).join('\n');
      return `Sus facturas recientes:\n${list}`;
    }
    return `Hola ${context.clientName ?? ''}, puedo ayudarle con información sobre sus facturas, pagos y estado de cuenta. Escriba por ejemplo "¿cuál es mi estado de cuenta?" o "¿cuál es mi saldo?".`;
  }
}
