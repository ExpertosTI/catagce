import { Injectable, Inject } from '@nestjs/common';
import { eq, sql, and, gte } from 'drizzle-orm';
import { orders, products, buyerContacts, auditLogs } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async getDashboard(sellerId: string) {
    const allOrders = await this.db.query.orders.findMany({
      where: eq(orders.sellerId, sellerId),
    });
    const allProducts = await this.db.query.products.findMany({
      where: eq(products.sellerId, sellerId),
    });
    const contacts = await this.db.query.buyerContacts.findMany({
      where: eq(buyerContacts.sellerId, sellerId),
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = allOrders.filter((o: any) => new Date(o.createdAt) >= thirtyDaysAgo);

    const totalRevenue = allOrders
      .filter((o: any) => o.status === 'confirmed')
      .reduce((sum: number, o: any) => sum + parseFloat(o.totalAmount || '0'), 0);

    const topProducts = allProducts
      .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map((p: any) => ({ id: p.id, name: p.name, views: p.views, price: p.basePrice }));

    return {
      totalProducts: allProducts.filter((p: any) => p.isActive).length,
      totalOrders: allOrders.length,
      pendingOrders: allOrders.filter((o: any) => ['submitted', 'reserved'].includes(o.status)).length,
      confirmedOrders: allOrders.filter((o: any) => o.status === 'confirmed').length,
      totalRevenue: totalRevenue.toFixed(2),
      recentOrdersCount: recentOrders.length,
      totalBuyers: contacts.length,
      topProducts,
      ordersByStatus: this.groupBy(allOrders, 'status'),
    };
  }

  private groupBy(arr: any[], key: string) {
    return arr.reduce((acc: Record<string, number>, item: any) => {
      acc[item[key]] = (acc[item[key]] || 0) + 1;
      return acc;
    }, {});
  }
}
