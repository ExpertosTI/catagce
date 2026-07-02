import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { eq, and, inArray, isNotNull } from 'drizzle-orm';
import { invoices, clients, companies } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { NotificationsService } from './notifications.service';
import { generateWithGemini } from '../ai/gemini.util';
import { getCompanyGeminiKey } from '../ai/company-ai.util';
import { formatCurrency } from '../common/format-currency';

const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const DEDUPE_WINDOW_HOURS = 20;
const DUE_SOON_DAYS = 3;

@Injectable()
export class InvoiceReminderService implements OnModuleInit {
  private readonly logger = new Logger(InvoiceReminderService.name);

  constructor(
    @Inject(DRIZZLE) private db: any,
    private notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    setTimeout(() => this.runCheck().catch((err) => this.logger.error(err)), 15_000);
    setInterval(() => this.runCheck().catch((err) => this.logger.error(err)), CHECK_INTERVAL_MS);
  }

  async runCheck() {
    const rows = await this.db.select({
      id: invoices.id,
      companyId: invoices.companyId,
      clientId: invoices.clientId,
      reference: invoices.reference,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      paidAmount: invoices.paidAmount,
      dueDate: invoices.dueDate,
      clientName: clients.name,
      companyName: companies.name,
    })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .innerJoin(companies, eq(invoices.companyId, companies.id))
      .where(and(
        inArray(invoices.status, ['issued', 'partially_paid']),
        isNotNull(invoices.dueDate),
      ));

    let processed = 0;
    for (const inv of rows) {
      const balance = parseFloat(inv.totalAmount || '0') - parseFloat(inv.paidAmount || '0');
      if (balance <= 0) continue;

      const dueDate = new Date(inv.dueDate);
      const daysDiff = Math.floor((dueDate.getTime() - Date.now()) / 86_400_000);

      let type: string;
      if (daysDiff < 0) type = 'invoice_overdue';
      else if (daysDiff <= DUE_SOON_DAYS) type = 'invoice_due_soon';
      else continue;

      const alreadyNotified = await this.notificationsService.existsRecent(
        inv.companyId, inv.id, type, DEDUPE_WINDOW_HOURS,
      );
      if (alreadyNotified) continue;

      if (type === 'invoice_overdue' && inv.status !== 'overdue') {
        await this.db.update(invoices).set({ status: 'overdue', updatedAt: new Date() })
          .where(eq(invoices.id, inv.id));
      }

      const { staffMessage, clientMessage, title } = await this.buildMessages({
        companyId: inv.companyId,
        reference: inv.reference,
        clientName: inv.clientName,
        companyName: inv.companyName,
        balance,
        daysDiff,
        overdue: type === 'invoice_overdue',
      });

      await this.notificationsService.create({
        companyId: inv.companyId,
        audience: 'staff',
        type,
        title,
        body: staffMessage,
        invoiceId: inv.id,
      });

      await this.notificationsService.create({
        companyId: inv.companyId,
        audience: 'client',
        clientId: inv.clientId,
        type,
        title,
        body: clientMessage,
        invoiceId: inv.id,
      });

      processed += 1;
    }

    if (processed > 0) this.logger.log(`Notificaciones de vencimiento generadas: ${processed}`);
    return { processed };
  }

  private async buildMessages(opts: {
    companyId: string;
    reference: string; clientName: string; companyName: string;
    balance: number; daysDiff: number; overdue: boolean;
  }) {
    const balanceFmt = formatCurrency(opts.balance);
    const title = opts.overdue
      ? `Factura ${opts.reference} vencida`
      : `Factura ${opts.reference} vence pronto`;

    const prompt = `Eres el asistente de cobranza de "${opts.companyName}", una empresa de importación en Santo Domingo, República Dominicana.
Genera dos mensajes cortos en español (máximo 2 frases cada uno, tono profesional y amable, sin emojis excesivos, montos en pesos dominicanos con el símbolo RD$):
1. "staffMessage": alerta interna para el equipo administrativo sobre esta factura.
2. "clientMessage": recordatorio de pago amable dirigido directamente al cliente.

Datos: factura ${opts.reference}, cliente ${opts.clientName}, saldo pendiente ${balanceFmt}, ${opts.overdue ? `vencida hace ${Math.abs(opts.daysDiff)} día(s)` : `vence en ${opts.daysDiff} día(s)`}.

Responde SOLO con JSON válido de la forma: {"staffMessage": "...", "clientMessage": "..."}`;

    const geminiKey = await getCompanyGeminiKey(this.db, opts.companyId);
    const raw = await generateWithGemini(prompt, undefined, geminiKey);
    if (raw) {
      try {
        const cleaned = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.staffMessage && parsed.clientMessage) {
          return { title, staffMessage: parsed.staffMessage, clientMessage: parsed.clientMessage };
        }
      } catch {
        // fall through to template
      }
    }

    const staffMessage = opts.overdue
      ? `La factura ${opts.reference} de ${opts.clientName} está vencida hace ${Math.abs(opts.daysDiff)} día(s) con un saldo de ${balanceFmt}.`
      : `La factura ${opts.reference} de ${opts.clientName} vence en ${opts.daysDiff} día(s), saldo pendiente ${balanceFmt}.`;
    const clientMessage = opts.overdue
      ? `Hola ${opts.clientName}, su factura ${opts.reference} está vencida con un saldo de ${balanceFmt}. Le agradecemos regularizar su pago a la brevedad.`
      : `Hola ${opts.clientName}, le recordamos que su factura ${opts.reference} vence en ${opts.daysDiff} día(s) por un saldo de ${balanceFmt}.`;

    return { title, staffMessage, clientMessage };
  }
}
