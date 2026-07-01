import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { sellers, sellerBranding, sellerApiKeys, sellerSettings } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';

@Injectable()
export class SellersService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async getProfile(sellerId: string) {
    const seller = await this.db.query.sellers.findFirst({
      where: eq(sellers.id, sellerId),
      with: { branding: true },
    });
    if (!seller) throw new NotFoundException('Vendedor no encontrado');
    return seller;
  }

  async updateProfile(sellerId: string, data: { name?: string; email?: string; phone?: string }) {
    const [seller] = await this.db
      .update(sellers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sellers.id, sellerId))
      .returning();
    return seller;
  }

  async getBranding(sellerId: string) {
    const row = await this.db.query.sellerBranding.findFirst({
      where: eq(sellerBranding.sellerId, sellerId),
    });
    return row ?? {
      primaryColor: '#00D1FF',
      accentColor: '#FF8A00',
      welcomeMessage: '',
      logoUrl: null,
    };
  }

  async updateBranding(sellerId: string, data: {
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    customDomain?: string;
    welcomeMessage?: string;
  }) {
    const payload = {
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor,
      accentColor: data.accentColor,
      customDomain: data.customDomain,
      welcomeMessage: data.welcomeMessage,
    };
    const existing = await this.getBranding(sellerId);

    if (existing) {
      const [branding] = await this.db
        .update(sellerBranding)
        .set({ ...payload, updatedAt: new Date() })
        .where(eq(sellerBranding.sellerId, sellerId))
        .returning();
      return branding;
    }

    const [branding] = await this.db
      .insert(sellerBranding)
      .values({ sellerId, ...payload })
      .returning();
    return branding;
  }

  async listApiKeys(sellerId: string) {
    const keys = await this.db.query.sellerApiKeys.findMany({
      where: eq(sellerApiKeys.sellerId, sellerId),
    });
    return keys.map((k: { id: string; name: string; key: string; lastUsedAt: Date | null; createdAt: Date }) => ({
      id: k.id,
      name: k.name,
      keyPreview: `${k.key.slice(0, 8)}...${k.key.slice(-4)}`,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  async getOnboarding(sellerId: string) {
    const settings = await this.db.query.sellerSettings.findFirst({
      where: eq(sellerSettings.sellerId, sellerId),
    });
    return {
      completed: settings?.onboardingCompleted ?? false,
      step: settings?.onboardingStep ?? 0,
    };
  }

  async updateOnboarding(sellerId: string, data: { step?: number; completed?: boolean }) {
    const existing = await this.db.query.sellerSettings.findFirst({
      where: eq(sellerSettings.sellerId, sellerId),
    });
    if (existing) {
      await this.db.update(sellerSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sellerSettings.sellerId, sellerId));
    } else {
      await this.db.insert(sellerSettings).values({ sellerId, ...data });
    }
    return this.getOnboarding(sellerId);
  }
}
