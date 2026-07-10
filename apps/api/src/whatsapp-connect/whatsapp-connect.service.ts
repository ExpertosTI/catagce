import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { sellerSettings, sellers } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { EvolutionCreds, evolutionAdminKey, evolutionConfigured } from '../whatsapp/evolution-config';

function instanceNameFor(sellerId: string, slug?: string | null) {
  const base = (slug || sellerId.slice(0, 8))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
  return `catagce-${base}`;
}

function extractQr(data: any): string | null {
  return (
    data?.qrcode?.base64
    || data?.base64
    || data?.qrcode?.code
    || data?.code
    || null
  );
}

function extractHash(data: any): string | null {
  if (typeof data?.hash === 'string') return data.hash;
  if (data?.hash?.apikey) return data.hash.apikey;
  if (data?.instance?.apikey) return data.instance.apikey;
  return null;
}

@Injectable()
export class WhatsAppConnectService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private whatsapp: WhatsAppService,
  ) {}

  private async getSeller(sellerId: string) {
    const seller = await this.db.query.sellers.findFirst({ where: eq(sellers.id, sellerId) });
    if (!seller) throw new NotFoundException('Vendedor no encontrado');
    return seller;
  }

  private async getSettings(sellerId: string) {
    return this.db.query.sellerSettings.findFirst({ where: eq(sellerSettings.sellerId, sellerId) });
  }

  private async upsertSettings(sellerId: string, patch: Record<string, unknown>) {
    const existing = await this.getSettings(sellerId);
    if (existing) {
      await this.db.update(sellerSettings).set({ ...patch, updatedAt: new Date() })
        .where(eq(sellerSettings.sellerId, sellerId));
    } else {
      await this.db.insert(sellerSettings).values({ sellerId, ...patch });
    }
  }

  async getCreds(sellerId: string): Promise<EvolutionCreds | null> {
    const settings = await this.getSettings(sellerId);
    if (settings?.evolutionInstance && settings?.evolutionToken) {
      return { instance: settings.evolutionInstance, apiKey: settings.evolutionToken };
    }
    return null;
  }

  async status(sellerId: string) {
    const platformOk = evolutionConfigured();
    const settings = await this.getSettings(sellerId);
    const creds = await this.getCreds(sellerId);

    if (!creds) {
      return {
        platformOk,
        connected: false,
        state: null,
        instance: null,
        phone: settings?.whatsappNumber || null,
        message: platformOk
          ? 'Conecta tu WhatsApp escaneando el código QR'
          : 'WhatsApp de plataforma no configurado (contacta a Renace)',
      };
    }

    const live = await this.whatsapp.status(creds);
    const connected = Boolean(live.connected);
    const state = String(live.state || settings?.evolutionStatus || 'unknown');

    if (connected && settings?.evolutionStatus !== 'open') {
      await this.upsertSettings(sellerId, {
        evolutionStatus: 'open',
        evolutionPhone: settings?.evolutionPhone || settings?.whatsappNumber || null,
      });
    } else if (!connected && settings?.evolutionStatus === 'open') {
      await this.upsertSettings(sellerId, { evolutionStatus: state });
    }

    return {
      platformOk,
      connected,
      state,
      instance: creds.instance,
      phone: settings?.evolutionPhone || settings?.whatsappNumber || null,
      message: connected
        ? 'WhatsApp conectado — listo para notificaciones y difusión'
        : 'Escanea el QR con WhatsApp → Dispositivos vinculados',
    };
  }

  async start(sellerId: string) {
    if (!evolutionConfigured()) {
      throw new BadRequestException('Evolution API no está configurada en el servidor');
    }

    const seller = await this.getSeller(sellerId);
    let settings = await this.getSettings(sellerId);
    let instance = settings?.evolutionInstance || instanceNameFor(sellerId, seller.slug);
    let token = settings?.evolutionToken || null;
    let qr: string | null = null;

    if (!token) {
      const created = await this.whatsapp.createInstance(instance);
      if (!created.ok) {
        // Instance may already exist — try fetch connect with admin key as instance name
        const existingName = instance;
        const retry = await this.whatsapp.adminFetch(
          `/instance/connect/${encodeURIComponent(existingName)}`,
          { method: 'GET' },
        );
        if (!retry.ok) {
          throw new BadRequestException(created.detail || 'No se pudo crear la instancia WhatsApp');
        }
        qr = extractQr(retry.data);
        token = evolutionAdminKey();
        await this.upsertSettings(sellerId, {
          evolutionInstance: instance,
          evolutionToken: token,
          evolutionStatus: 'connecting',
        });
      } else {
        token = extractHash(created.data) || evolutionAdminKey();
        qr = extractQr(created.data);
        instance = created.data?.instance?.instanceName || instance;
        await this.upsertSettings(sellerId, {
          evolutionInstance: instance,
          evolutionToken: token,
          evolutionStatus: 'connecting',
        });
      }
    }

    const creds: EvolutionCreds = { instance, apiKey: token! };
    if (!qr) {
      const conn = await this.whatsapp.connectInstance(creds);
      if (!conn.ok) {
        // Try with admin key
        const adminConn = await this.whatsapp.adminFetch(
          `/instance/connect/${encodeURIComponent(instance)}`,
          { method: 'GET' },
        );
        if (!adminConn.ok) {
          throw new BadRequestException(conn.detail || 'No se pudo obtener el QR');
        }
        qr = extractQr(adminConn.data);
      } else {
        qr = extractQr(conn.data);
      }
    }

    const live = await this.whatsapp.status(creds);
    if (live.connected) {
      await this.upsertSettings(sellerId, { evolutionStatus: 'open' });
      return {
        connected: true,
        qr: null,
        instance,
        state: live.state,
        message: 'Ya está conectado',
      };
    }

    if (!qr) {
      throw new BadRequestException('No se recibió código QR. Intenta de nuevo en unos segundos.');
    }

    // Ensure data-url prefix for <img src>
    const qrSrc = qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;

    return {
      connected: false,
      qr: qrSrc,
      instance,
      state: 'connecting',
      message: 'Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo y escanea',
    };
  }

  async refresh(sellerId: string) {
    return this.start(sellerId);
  }

  async disconnect(sellerId: string) {
    const creds = await this.getCreds(sellerId);
    if (creds) {
      await this.whatsapp.logoutInstance(creds).catch(() => null);
    }
    await this.upsertSettings(sellerId, {
      evolutionStatus: 'close',
      evolutionPhone: null,
    });
    return { ok: true, message: 'WhatsApp desconectado' };
  }
}
