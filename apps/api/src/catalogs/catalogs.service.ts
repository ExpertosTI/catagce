import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DRIZZLE } from '../database/database.module';
import { catalogs, catalogProducts, catalogPublications } from '@catagce/db';
import { eq } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WebhookDispatcherService } from '../common/services/webhook-dispatcher.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { isValidPhone, normalizePhoneDigits } from '../common/utils/phone.util';

const WEB_URL = (process.env.PUBLIC_WEB_URL || 'https://catagce.renace.tech').replace(/\/$/, '');

@Injectable()
export class CatalogsService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    @InjectQueue('catalog-render') private renderQueue: Queue,
    private webhookDispatcher: WebhookDispatcherService,
    private whatsapp: WhatsAppService,
  ) {}

  async findAll(sellerId: string) {
    return this.db.query.catalogs.findMany({
      where: eq(catalogs.sellerId, sellerId),
      with: { catalogProducts: true, publications: true },
    });
  }

  async findBySlug(slug: string) {
    return this.db.query.catalogs.findFirst({
      where: eq(catalogs.slug, slug),
      with: {
        catalogProducts: { with: { product: { with: { stockLevels: true } } } },
        seller: { with: { branding: true } },
        publications: true,
      },
    });
  }

  async create(sellerId: string, data: { name: string; slug: string; description?: string; productIds?: string[] }) {
    const [catalog] = await this.db.insert(catalogs)
      .values({ name: data.name, slug: data.slug, description: data.description, sellerId }).returning();

    if (data.productIds?.length) {
      await this.db.insert(catalogProducts).values(
        data.productIds.map((productId, index) => ({ catalogId: catalog.id, productId, sortOrder: index })),
      );
    }

    const publication = await this.publishInternal(catalog.id, sellerId);
    return { ...catalog, shareToken: publication.token };
  }

  async publish(catalogId: string, sellerId: string) {
    const catalog = await this.db.query.catalogs.findFirst({ where: eq(catalogs.id, catalogId) });
    if (!catalog || catalog.sellerId !== sellerId) throw new NotFoundException('Catálogo no encontrado');
    return this.publishInternal(catalogId, sellerId);
  }

  private async publishInternal(catalogId: string, sellerId: string) {
    const catalog = await this.db.query.catalogs.findFirst({
      where: eq(catalogs.id, catalogId),
      with: { catalogProducts: { with: { product: true } }, seller: { with: { branding: true } } },
    });

    const token = `cat_${randomBytes(16).toString('hex')}`;
    const [publication] = await this.db.insert(catalogPublications).values({
      catalogId,
      token,
      brandingSnapshot: catalog?.seller?.branding,
      productSnapshot: catalog?.catalogProducts,
    }).returning();

    await this.renderQueue.add('render-pdf', {
      catalogId, sellerId, publicationId: publication.id,
      catalogData: {
        name: catalog?.name, slug: catalog?.slug,
        products: catalog?.catalogProducts?.map((cp: any) => cp.product) || [],
      },
    });

    await this.webhookDispatcher.dispatch(sellerId, 'catalog.published', {
      catalogId, token: publication.token, slug: catalog?.slug,
    });

    return publication;
  }

  async shareViaWhatsApp(
    sellerId: string,
    catalogId: string,
    body: { phones: string[]; message?: string },
  ) {
    if (!this.whatsapp.configured()) {
      throw new BadRequestException('WhatsApp no está configurado');
    }

    const catalog = await this.db.query.catalogs.findFirst({
      where: eq(catalogs.id, catalogId),
      with: { publications: true },
    });
    if (!catalog || catalog.sellerId !== sellerId) throw new NotFoundException('Catálogo no encontrado');

    let token = catalog.publications?.[0]?.token;
    if (!token) {
      const pub = await this.publishInternal(catalogId, sellerId);
      token = pub.token;
    }

    const link = `${WEB_URL}/order/${token}`;
    const text = body.message?.trim()
      || `¡Hola! 👋 Te comparto nuestro catálogo *${catalog.name}*:\n\n${link}\n\nPuedes ver productos y hacer tu pedido desde el enlace.`;

    const results: Array<{ phone: string; ok: boolean; error?: string }> = [];
    for (const raw of body.phones || []) {
      const phone = normalizePhoneDigits(raw);
      if (!isValidPhone(phone)) {
        results.push({ phone: raw, ok: false, error: 'invalid_phone' });
        continue;
      }
      const sent = await this.whatsapp.sendText(phone, text);
      results.push({ phone, ok: sent.ok, error: sent.ok ? undefined : sent.error });
    }

    const sent = results.filter((r) => r.ok).length;
    if (!sent) throw new BadRequestException('No se pudo enviar a ningún número. Verifica WhatsApp y los teléfonos.');

    return { ok: true, link, sent, failed: results.length - sent, results };
  }
}
