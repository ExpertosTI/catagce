import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { orders, sellers } from '@catagce/db';
import { eq } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue
  ) {}

  async findAll(sellerId: string) {
    return this.db.select().from(orders).where(eq(orders.sellerId, sellerId));
  }

  async create(data: any) {
    // 1. Persistir el pedido
    const [order] = await this.db.insert(orders).values({
      sellerId: data.sellerId,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone,
      totalAmount: data.totalAmount,
      status: 'submitted',
    }).returning();

    // 2. Obtener info del vendedor para la notificación
    const seller = await this.db.query.sellers.findFirst({
      where: eq(sellers.id, data.sellerId)
    });

    // 3. Disparar Superpoder: Notificación WhatsApp
    await this.notificationsQueue.add('ORDER_CREATED', {
      type: 'ORDER_CREATED',
      data: {
        phone: data.buyerPhone,
        orderId: order.id,
        sellerName: seller?.name || 'Comercio Catagce',
        buyerName: data.buyerName,
        totalAmount: data.totalAmount,
      }
    });
    
    return order;
  }

  async updateStatus(id: string, status: string) {
    const [order] = await this.db.update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();

    // Si el pedido se confirma, podrías disparar la lógica de descuento de inventario aquí
    // (Por ahora simplificado, en un sistema real iterarías sobre los items del pedido)
    if (status === 'confirmed') {
      console.log(`[Inventory Superpower] Descontando stock para el pedido ${id}`);
    }

    return order;
  }
}
