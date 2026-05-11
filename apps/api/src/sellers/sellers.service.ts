import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { sellers, sellerBranding } from '@catagce/db';
import { eq } from 'drizzle-orm';

@Injectable()
export class SellersService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async getBranding(sellerId: string) {
    let [branding] = await this.db
      .select()
      .from(sellerBranding)
      .where(eq(sellerBranding.sellerId, sellerId))
      .limit(1);

    if (!branding) {
      // Create default branding if missing
      [branding] = await this.db
        .insert(sellerBranding)
        .values({ sellerId })
        .returning();
    }

    return branding;
  }

  async updateBranding(sellerId: string, data: any) {
    const [updated] = await this.db
      .insert(sellerBranding)
      .values({ ...data, sellerId, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: sellerBranding.sellerId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return updated;
  }

  async getProfile(sellerId: string) {
    const [seller] = await this.db
      .select()
      .from(sellers)
      .where(eq(sellers.id, sellerId))
      .limit(1);
    
    const branding = await this.getBranding(sellerId);
    
    return { ...seller, branding };
  }
}
