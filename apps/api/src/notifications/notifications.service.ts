import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { notifications } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';

export type NotificationInput = {
  companyId: string;
  audience: 'staff' | 'client';
  clientId?: string;
  type: string;
  title: string;
  body: string;
  invoiceId?: string;
};

@Injectable()
export class NotificationsService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async create(data: NotificationInput) {
    const [row] = await this.db.insert(notifications).values({
      companyId: data.companyId,
      audience: data.audience,
      clientId: data.clientId,
      type: data.type,
      subject: data.title,
      body: data.body,
      invoiceId: data.invoiceId,
      channel: 'app',
      sentAt: new Date(),
    }).returning();
    return row;
  }

  async existsRecent(companyId: string, invoiceId: string, type: string, sinceHours: number) {
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
    const rows = await this.db.select({ id: notifications.id }).from(notifications)
      .where(and(
        eq(notifications.companyId, companyId),
        eq(notifications.invoiceId, invoiceId),
        eq(notifications.type, type),
        sql`${notifications.createdAt} >= ${since}`,
      )).limit(1);
    return rows.length > 0;
  }

  async listForStaff(user: AuthUser, onlyUnread = false) {
    const conditions = [eq(notifications.companyId, user.companyId), eq(notifications.audience, 'staff')];
    if (onlyUnread) conditions.push(eq(notifications.isRead, false));
    return this.db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async listForClient(user: AuthUser, onlyUnread = false) {
    const conditions = [
      eq(notifications.companyId, user.companyId),
      eq(notifications.audience, 'client'),
      eq(notifications.clientId, user.userId),
    ];
    if (onlyUnread) conditions.push(eq(notifications.isRead, false));
    return this.db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async unreadCountStaff(user: AuthUser) {
    const [row] = await this.db.select({ count: sql<number>`COUNT(*)::int` }).from(notifications)
      .where(and(
        eq(notifications.companyId, user.companyId),
        eq(notifications.audience, 'staff'),
        eq(notifications.isRead, false),
      ));
    return row?.count ?? 0;
  }

  async unreadCountClient(user: AuthUser) {
    const [row] = await this.db.select({ count: sql<number>`COUNT(*)::int` }).from(notifications)
      .where(and(
        eq(notifications.companyId, user.companyId),
        eq(notifications.audience, 'client'),
        eq(notifications.clientId, user.userId),
        eq(notifications.isRead, false),
      ));
    return row?.count ?? 0;
  }

  async markRead(user: AuthUser, id: string) {
    await this.db.update(notifications).set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.companyId, user.companyId)));
    return { ok: true };
  }

  async markAllRead(user: AuthUser, audience: 'staff' | 'client') {
    const conditions = [
      eq(notifications.companyId, user.companyId),
      eq(notifications.audience, audience),
      eq(notifications.isRead, false),
    ];
    if (audience === 'client') conditions.push(eq(notifications.clientId, user.userId));
    await this.db.update(notifications).set({ isRead: true, readAt: new Date() })
      .where(and(...conditions));
    return { ok: true };
  }
}
