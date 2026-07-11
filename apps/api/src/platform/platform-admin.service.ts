import {
  Injectable, Inject, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { eq, and, desc, asc } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import {
  planChangeRequests, sellers, sellerUsers, plans,
} from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { PlansService } from '../plans/plans.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

const ALLOWED_PLANS = new Set(['free', 'pro', 'business']);

@Injectable()
export class PlatformAdminService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private plans: PlansService,
    private whatsapp: WhatsAppService,
  ) {}

  async createUpgradeRequest(
    sellerId: string,
    body: {
      toPlan: string;
      paymentNote?: string;
      paymentMethod?: string;
      amountClaimed?: string;
    },
  ) {
    const toPlan = (body.toPlan || '').trim();
    if (!ALLOWED_PLANS.has(toPlan) || toPlan === 'free') {
      throw new BadRequestException('Plan destino inválido');
    }
    const [seller] = await this.db.select().from(sellers).where(eq(sellers.id, sellerId)).limit(1);
    if (!seller) throw new NotFoundException('Seller no encontrado');
    if (seller.planCode === toPlan) {
      throw new BadRequestException('Ya tienes ese plan');
    }

    const [pending] = await this.db
      .select({ id: planChangeRequests.id })
      .from(planChangeRequests)
      .where(and(eq(planChangeRequests.sellerId, sellerId), eq(planChangeRequests.status, 'pending')))
      .limit(1);
    if (pending) {
      throw new ConflictException('Ya tienes una solicitud pendiente. Espera la revisión del equipo.');
    }

    const [row] = await this.db
      .insert(planChangeRequests)
      .values({
        sellerId,
        fromPlan: seller.planCode || 'free',
        toPlan,
        status: 'pending',
        paymentNote: body.paymentNote?.trim() || null,
        paymentMethod: body.paymentMethod?.trim() || null,
        amountClaimed: body.amountClaimed?.trim() || null,
      })
      .returning();

    await this.notifyAdmins(
      `🔔 Nueva solicitud de plan\n` +
        `• Seller: ${seller.name} (${seller.slug})\n` +
        `• De: ${seller.planCode} → ${toPlan}\n` +
        `• Pago: ${body.paymentMethod || '—'} ${body.amountClaimed || ''}\n` +
        `• Nota: ${body.paymentNote || '—'}\n` +
        `Panel: /dashboard/platform/requests`,
    );

    return row;
  }

  async myRequests(sellerId: string) {
    return this.db
      .select()
      .from(planChangeRequests)
      .where(eq(planChangeRequests.sellerId, sellerId))
      .orderBy(desc(planChangeRequests.createdAt))
      .limit(20);
  }

  async listRequests(status?: string) {
    const rows = status
      ? await this.db
          .select({
            id: planChangeRequests.id,
            sellerId: planChangeRequests.sellerId,
            fromPlan: planChangeRequests.fromPlan,
            toPlan: planChangeRequests.toPlan,
            status: planChangeRequests.status,
            paymentNote: planChangeRequests.paymentNote,
            paymentMethod: planChangeRequests.paymentMethod,
            amountClaimed: planChangeRequests.amountClaimed,
            adminNote: planChangeRequests.adminNote,
            reviewedBy: planChangeRequests.reviewedBy,
            reviewedAt: planChangeRequests.reviewedAt,
            createdAt: planChangeRequests.createdAt,
            sellerName: sellers.name,
            sellerSlug: sellers.slug,
            sellerEmail: sellers.email,
            sellerPhone: sellers.phone,
            currentPlan: sellers.planCode,
          })
          .from(planChangeRequests)
          .innerJoin(sellers, eq(planChangeRequests.sellerId, sellers.id))
          .where(eq(planChangeRequests.status, status))
          .orderBy(desc(planChangeRequests.createdAt))
      : await this.db
          .select({
            id: planChangeRequests.id,
            sellerId: planChangeRequests.sellerId,
            fromPlan: planChangeRequests.fromPlan,
            toPlan: planChangeRequests.toPlan,
            status: planChangeRequests.status,
            paymentNote: planChangeRequests.paymentNote,
            paymentMethod: planChangeRequests.paymentMethod,
            amountClaimed: planChangeRequests.amountClaimed,
            adminNote: planChangeRequests.adminNote,
            reviewedBy: planChangeRequests.reviewedBy,
            reviewedAt: planChangeRequests.reviewedAt,
            createdAt: planChangeRequests.createdAt,
            sellerName: sellers.name,
            sellerSlug: sellers.slug,
            sellerEmail: sellers.email,
            sellerPhone: sellers.phone,
            currentPlan: sellers.planCode,
          })
          .from(planChangeRequests)
          .innerJoin(sellers, eq(planChangeRequests.sellerId, sellers.id))
          .orderBy(desc(planChangeRequests.createdAt))
          .limit(100);

    return rows;
  }

  async pendingCount() {
    const rows = await this.db
      .select({ id: planChangeRequests.id })
      .from(planChangeRequests)
      .where(eq(planChangeRequests.status, 'pending'));
    return { count: rows.length };
  }

  async reviewRequest(
    requestId: string,
    adminEmail: string,
    body: { action: 'approve' | 'reject'; adminNote?: string },
  ) {
    const [req] = await this.db
      .select()
      .from(planChangeRequests)
      .where(eq(planChangeRequests.id, requestId))
      .limit(1);
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.status !== 'pending') throw new BadRequestException('Solicitud ya revisada');

    if (body.action === 'approve') {
      await this.plans.assignSellerPlan(req.sellerId, req.toPlan);
    }

    const [updated] = await this.db
      .update(planChangeRequests)
      .set({
        status: body.action === 'approve' ? 'approved' : 'rejected',
        adminNote: body.adminNote?.trim() || null,
        reviewedBy: adminEmail,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(planChangeRequests.id, requestId))
      .returning();

    const [seller] = await this.db.select().from(sellers).where(eq(sellers.id, req.sellerId)).limit(1);
    if (seller?.phone) {
      const msg =
        body.action === 'approve'
          ? `✅ Tu plan fue actualizado a *${req.toPlan}*. ¡Gracias por tu pago!`
          : `❌ Tu solicitud de plan *${req.toPlan}* no fue aprobada.${body.adminNote ? ` Motivo: ${body.adminNote}` : ''}`;
      await this.whatsapp.sendText(seller.phone, msg).catch(() => null);
    }

    return updated;
  }

  async listSellersDetailed() {
    const rows = await this.db
      .select({
        id: sellers.id,
        name: sellers.name,
        slug: sellers.slug,
        email: sellers.email,
        phone: sellers.phone,
        planCode: sellers.planCode,
        isActive: sellers.isActive,
        createdAt: sellers.createdAt,
      })
      .from(sellers)
      .orderBy(asc(sellers.createdAt));

    const users = await this.db
      .select({
        sellerId: sellerUsers.sellerId,
        email: sellerUsers.email,
        name: sellerUsers.name,
        role: sellerUsers.role,
      })
      .from(sellerUsers)
      .where(eq(sellerUsers.isActive, true));

    const bySeller = new Map<string, typeof users>();
    for (const u of users) {
      const list = bySeller.get(u.sellerId) || [];
      list.push(u);
      bySeller.set(u.sellerId, list);
    }

    return rows.map((s: any) => ({
      ...s,
      users: bySeller.get(s.id) || [],
    }));
  }

  /** Genera contraseña temporal; el admin la ve una vez (y opcionalmente se envía por WhatsApp). */
  async resetSellerPassword(
    sellerId: string,
    opts?: { password?: string; notifyWhatsApp?: boolean },
  ) {
    const [seller] = await this.db.select().from(sellers).where(eq(sellers.id, sellerId)).limit(1);
    if (!seller) throw new NotFoundException('Seller no encontrado');

    const [owner] = await this.db
      .select()
      .from(sellerUsers)
      .where(and(eq(sellerUsers.sellerId, sellerId), eq(sellerUsers.isActive, true)))
      .orderBy(asc(sellerUsers.createdAt))
      .limit(1);
    if (!owner) throw new NotFoundException('Usuario de la cuenta no encontrado');

    const temp =
      opts?.password?.trim() && opts.password.trim().length >= 8
        ? opts.password.trim()
        : `Rk${randomBytes(4).toString('hex')}!`;

    const passwordHash = await bcrypt.hash(temp, 12);
    await this.db
      .update(sellerUsers)
      .set({ passwordHash })
      .where(eq(sellerUsers.id, owner.id));

    let whatsappSent = false;
    if (opts?.notifyWhatsApp !== false && seller.phone) {
      const res = await this.whatsapp.sendText(
        seller.phone,
        `🔐 Restablecimiento de acceso Catagce\nEmail: ${owner.email}\nNueva contraseña temporal: ${temp}\nCámbiala al entrar en Configuración si puedes.`,
      );
      whatsappSent = Boolean(res && 'ok' in res && res.ok);
    }

    return {
      sellerId,
      userId: owner.id,
      email: owner.email,
      temporaryPassword: temp,
      whatsappSent,
      phone: seller.phone || null,
    };
  }

  private async notifyAdmins(text: string) {
    const phones = (process.env.PLATFORM_NOTIFY_PHONES || process.env.PLATFORM_NOTIFY_PHONE || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    for (const phone of phones) {
      await this.whatsapp.sendText(phone, text).catch(() => null);
    }
  }

  async planCatalog() {
    return this.db.select().from(plans).orderBy(asc(plans.sortOrder));
  }
}
