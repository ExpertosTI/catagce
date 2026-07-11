import { Injectable, Inject, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { eq, and, asc } from 'drizzle-orm';
import {
  plans, planFeatures, sellers, platformAdmins, sellerUsers,
} from '@catagce/db';
import { DRIZZLE } from '../database/database.module';

export type FeatureEntitlement = { enabled: boolean; limit: number | null };

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async onModuleInit() {
    await this.ensureSeed();
  }

  /** Seed / sync planes+features (idempotente) y SUPER_ADMIN_EMAILS */
  async ensureSeed() {
    try {
      const planRows = [
        { code: 'free', name: 'Free', description: 'Catálogo y compartir por WhatsApp', sortOrder: 0 },
        { code: 'pro', name: 'Pro', description: 'Difusión, pedidos e inbox — $6 USD/mes', sortOrder: 1 },
        { code: 'business', name: 'Enterprise', description: 'Sin límites + IA — $25 USD/mes', sortOrder: 2 },
      ];
      for (const p of planRows) {
        await this.db.insert(plans).values(p).onConflictDoNothing();
        await this.db
          .update(plans)
          .set({
            name: p.name,
            description: p.description,
            sortOrder: p.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(plans.code, p.code));
      }

      const seedFeatures: Array<{ planCode: string; featureKey: string; enabled: boolean; limitValue: number | null }> = [
        { planCode: 'free', featureKey: 'products', enabled: true, limitValue: 50 },
        { planCode: 'free', featureKey: 'catalogs', enabled: true, limitValue: 2 },
        { planCode: 'free', featureKey: 'whatsapp_connect', enabled: true, limitValue: null },
        { planCode: 'free', featureKey: 'catalog_wa_share', enabled: true, limitValue: null },
        { planCode: 'free', featureKey: 'broadcast', enabled: true, limitValue: null },
        { planCode: 'free', featureKey: 'orders', enabled: true, limitValue: null },
        { planCode: 'free', featureKey: 'inbox', enabled: true, limitValue: null },
        { planCode: 'free', featureKey: 'ai', enabled: false, limitValue: null },
        { planCode: 'free', featureKey: 'inventory', enabled: true, limitValue: null },
        { planCode: 'free', featureKey: 'analytics', enabled: true, limitValue: 1 },
        { planCode: 'pro', featureKey: 'products', enabled: true, limitValue: 500 },
        { planCode: 'pro', featureKey: 'catalogs', enabled: true, limitValue: 20 },
        { planCode: 'pro', featureKey: 'whatsapp_connect', enabled: true, limitValue: null },
        { planCode: 'pro', featureKey: 'catalog_wa_share', enabled: true, limitValue: null },
        { planCode: 'pro', featureKey: 'broadcast', enabled: true, limitValue: null },
        { planCode: 'pro', featureKey: 'orders', enabled: true, limitValue: null },
        { planCode: 'pro', featureKey: 'inbox', enabled: true, limitValue: null },
        { planCode: 'pro', featureKey: 'ai', enabled: false, limitValue: null },
        { planCode: 'pro', featureKey: 'inventory', enabled: true, limitValue: null },
        { planCode: 'pro', featureKey: 'analytics', enabled: true, limitValue: null },
        { planCode: 'business', featureKey: 'products', enabled: true, limitValue: null },
        { planCode: 'business', featureKey: 'catalogs', enabled: true, limitValue: null },
        { planCode: 'business', featureKey: 'whatsapp_connect', enabled: true, limitValue: null },
        { planCode: 'business', featureKey: 'catalog_wa_share', enabled: true, limitValue: null },
        { planCode: 'business', featureKey: 'broadcast', enabled: true, limitValue: null },
        { planCode: 'business', featureKey: 'orders', enabled: true, limitValue: null },
        { planCode: 'business', featureKey: 'inbox', enabled: true, limitValue: null },
        { planCode: 'business', featureKey: 'ai', enabled: true, limitValue: null },
        { planCode: 'business', featureKey: 'inventory', enabled: true, limitValue: null },
        { planCode: 'business', featureKey: 'analytics', enabled: true, limitValue: null },
      ];
      for (const f of seedFeatures) {
        await this.db.insert(planFeatures).values(f).onConflictDoNothing();
      }

      // Free operativo: no bloquear difusión / pedidos / inbox (rompe el producto)
      for (const key of ['broadcast', 'orders', 'inbox'] as const) {
        await this.db
          .update(planFeatures)
          .set({ enabled: true, updatedAt: new Date() })
          .where(and(eq(planFeatures.planCode, 'free'), eq(planFeatures.featureKey, key)));
        for (const planCode of ['pro', 'business'] as const) {
          await this.db
            .update(planFeatures)
            .set({ enabled: true, updatedAt: new Date() })
            .where(and(eq(planFeatures.planCode, planCode), eq(planFeatures.featureKey, key)));
        }
      }

      const emails = (process.env.SUPER_ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      for (const email of emails) {
        await this.db.insert(platformAdmins).values({ email, name: 'Super Admin' }).onConflictDoNothing();
      }
    } catch (err) {
      console.warn('[plans] ensureSeed skipped:', (err as Error).message);
    }
  }

  async listPlans() {
    const all = await this.db.select().from(plans).orderBy(asc(plans.sortOrder));
    const features = await this.db.select().from(planFeatures);
    return all.map((p: any) => ({
      ...p,
      features: features.filter((f: any) => f.planCode === p.code),
    }));
  }

  async getSellerPlanCode(sellerId: string): Promise<string> {
    const [seller] = await this.db
      .select({ planCode: sellers.planCode })
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1);
    return seller?.planCode || 'free';
  }

  async getEntitlements(sellerId: string): Promise<{
    planCode: string;
    planName: string;
    features: Record<string, FeatureEntitlement>;
  }> {
    const planCode = await this.getSellerPlanCode(sellerId);
    const [plan] = await this.db.select().from(plans).where(eq(plans.code, planCode)).limit(1);
    const rows = await this.db
      .select()
      .from(planFeatures)
      .where(eq(planFeatures.planCode, planCode));

    const features: Record<string, FeatureEntitlement> = {};
    for (const row of rows) {
      features[row.featureKey] = {
        enabled: Boolean(row.enabled),
        limit: row.limitValue ?? null,
      };
    }
    return {
      planCode,
      planName: plan?.name || planCode,
      features,
    };
  }

  async hasFeature(sellerId: string, featureKey: string): Promise<boolean> {
    const { features } = await this.getEntitlements(sellerId);
    return Boolean(features[featureKey]?.enabled);
  }

  async assertLimit(sellerId: string, featureKey: string, currentCount: number) {
    const { features } = await this.getEntitlements(sellerId);
    const f = features[featureKey];
    if (!f?.enabled) {
      throw new BadRequestException(`Tu plan no incluye: ${featureKey}`);
    }
    if (f.limit != null && currentCount >= f.limit) {
      throw new BadRequestException(`Límite de ${featureKey} alcanzado (${f.limit}). Mejora tu plan.`);
    }
  }

  async isPlatformAdmin(email: string): Promise<boolean> {
    if (!email) return false;
    const normalized = email.trim().toLowerCase();
    const envList = (process.env.SUPER_ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (envList.includes(normalized)) return true;

    try {
      const [row] = await this.db
        .select()
        .from(platformAdmins)
        .where(and(eq(platformAdmins.email, normalized), eq(platformAdmins.isActive, true)))
        .limit(1);
      return Boolean(row);
    } catch {
      return false;
    }
  }

  async updateFeature(
    planCode: string,
    featureKey: string,
    data: { enabled?: boolean; limitValue?: number | null },
  ) {
    const [existing] = await this.db
      .select()
      .from(planFeatures)
      .where(and(eq(planFeatures.planCode, planCode), eq(planFeatures.featureKey, featureKey)))
      .limit(1);
    if (!existing) throw new NotFoundException('Feature no encontrada');

    const [updated] = await this.db
      .update(planFeatures)
      .set({
        enabled: data.enabled ?? existing.enabled,
        limitValue: data.limitValue === undefined ? existing.limitValue : data.limitValue,
        updatedAt: new Date(),
      })
      .where(eq(planFeatures.id, existing.id))
      .returning();
    return updated;
  }

  async assignSellerPlan(sellerId: string, planCode: string) {
    const [plan] = await this.db.select().from(plans).where(eq(plans.code, planCode)).limit(1);
    if (!plan) throw new NotFoundException('Plan no encontrado');
    const [updated] = await this.db
      .update(sellers)
      .set({ planCode, updatedAt: new Date() })
      .where(eq(sellers.id, sellerId))
      .returning();
    if (!updated) throw new NotFoundException('Seller no encontrado');
    return updated;
  }

  async listSellersWithPlans() {
    const rows = await this.db
      .select({
        id: sellers.id,
        name: sellers.name,
        slug: sellers.slug,
        email: sellers.email,
        planCode: sellers.planCode,
        isActive: sellers.isActive,
        createdAt: sellers.createdAt,
      })
      .from(sellers)
      .orderBy(asc(sellers.createdAt));
    return rows;
  }

  async listPlatformAdmins() {
    return this.db.select().from(platformAdmins);
  }

  async addPlatformAdmin(email: string, name?: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) throw new BadRequestException('Email inválido');
    const [row] = await this.db
      .insert(platformAdmins)
      .values({ email: normalized, name: name || null })
      .onConflictDoNothing()
      .returning();
    if (row) return row;
    const [existing] = await this.db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.email, normalized))
      .limit(1);
    return existing;
  }

  async mePayload(user: { userId: string; sellerId: string; email: string; role?: string; sellerName?: string }) {
    const entitlements = await this.getEntitlements(user.sellerId);
    const isPlatformAdmin = await this.isPlatformAdmin(user.email);
    const [sellerUser] = await this.db
      .select({ name: sellerUsers.name, email: sellerUsers.email, role: sellerUsers.role })
      .from(sellerUsers)
      .where(eq(sellerUsers.id, user.userId))
      .limit(1);
    return {
      user: {
        id: user.userId,
        email: user.email,
        name: sellerUser?.name,
        role: user.role || sellerUser?.role,
      },
      seller: {
        id: user.sellerId,
        name: user.sellerName,
        planCode: entitlements.planCode,
        planName: entitlements.planName,
      },
      planCode: entitlements.planCode,
      planName: entitlements.planName,
      features: entitlements.features,
      isPlatformAdmin,
    };
  }
}
