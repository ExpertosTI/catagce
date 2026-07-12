import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { platformSettings } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import {
  EvolutionCreds,
  evolutionAdminKey,
  evolutionConfigured,
} from '../whatsapp/evolution-config';

function extractQr(data: any): string | null {
  return (
    data?.qrcode?.base64
    || data?.base64
    || data?.qrcode?.code
    || data?.code
    || null
  );
}

/** WhatsApp de uso general (OTP, avisos platform) — lo configura el platform admin. */
@Injectable()
export class PlatformWhatsAppService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private whatsapp: WhatsAppService,
  ) {}

  private async row() {
    let r = await this.db.query.platformSettings.findFirst({
      where: eq(platformSettings.id, 1),
    });
    if (!r) {
      await this.db.insert(platformSettings).values({ id: 1, profileDisplayName: 'RENACE.TECH' });
      r = await this.db.query.platformSettings.findFirst({
        where: eq(platformSettings.id, 1),
      });
    }
    return r;
  }

  private async save(patch: Record<string, unknown>) {
    await this.row();
    await this.db.update(platformSettings)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(platformSettings.id, 1));
  }

  async getCreds(): Promise<EvolutionCreds | null> {
    return this.whatsapp.resolvePlatformCreds();
  }

  async status() {
    const platformOk = evolutionConfigured();
    const settings = await this.row();
    const creds = await this.getCreds();

    if (!creds) {
      return {
        platformOk,
        linked: false,
        connected: false,
        state: null,
        instance: null,
        phone: null,
        profileDisplayName: settings?.profileDisplayName || 'RENACE.TECH',
        message: !platformOk
          ? 'Falta EVOLUTION_API_URL / EVOLUTION_API_KEY en el servidor'
          : 'Vincula o conecta el WhatsApp de plataforma',
      };
    }

    const live = await this.whatsapp.status(creds);
    const connected = Boolean(live.connected);
    const state = String(live.state || settings?.evolutionStatus || 'unknown');

    if (connected && settings?.evolutionStatus !== 'open') {
      await this.save({ evolutionStatus: 'open' });
    } else if (!connected && settings?.evolutionStatus === 'open') {
      await this.save({ evolutionStatus: state });
    }

    return {
      platformOk,
      linked: true,
      connected,
      state,
      instance: creds.instance,
      phone: settings?.evolutionPhone || null,
      profileDisplayName: settings?.profileDisplayName || 'RENACE.TECH',
      message: connected
        ? 'WhatsApp de plataforma listo (OTP y avisos)'
        : 'Instancia vinculada pero no Connected en Evolution — abre el Manager o genera QR aquí',
    };
  }

  /** Vincular instancia ya existente en evoapi (ej. RENACE.TECH) sin crear otra. */
  async link(instanceRaw: string, displayName?: string) {
    if (!evolutionConfigured()) {
      throw new BadRequestException('Evolution API no está configurada en el servidor');
    }
    const instance = String(instanceRaw || '').trim();
    if (!instance) throw new BadRequestException('Nombre de instancia requerido');

    const key = evolutionAdminKey();
    if (!key) throw new BadRequestException('Falta EVOLUTION_API_KEY');

    const probe = await this.whatsapp.adminFetch('/instance/fetchInstances', { method: 'GET' });
    if (!probe.ok) {
      throw new BadRequestException(probe.detail || 'No se pudo listar instancias Evolution');
    }

    await this.save({
      evolutionInstance: instance,
      evolutionToken: key,
      evolutionStatus: 'unknown',
      profileDisplayName: String(displayName || 'RENACE.TECH').trim() || 'RENACE.TECH',
    });

    const creds: EvolutionCreds = { instance, apiKey: key };
    const live = await this.whatsapp.status(creds);
    await this.save({ evolutionStatus: String(live.state || 'unknown') });

    if (live.connected) {
      const name = String(displayName || 'RENACE.TECH').trim();
      if (name) await this.whatsapp.updateProfileName(name, creds).catch(() => null);
    }

    return this.status();
  }

  /**
   * QR solo si el admin lo pide. No se llama desde deploy.
   * Usa la instancia ya vinculada o crea catagce-platform.
   */
  async startQr() {
    if (!evolutionConfigured()) {
      throw new BadRequestException('Evolution API no está configurada en el servidor');
    }

    const settings = await this.row();
    let instance = settings?.evolutionInstance || 'catagce-platform';
    let token = settings?.evolutionToken || evolutionAdminKey();
    let qr: string | null = null;

    if (!settings?.evolutionInstance) {
      const created = await this.whatsapp.createInstance(instance);
      if (created.ok) {
        token = (created.data?.hash?.apikey || created.data?.hash || evolutionAdminKey()) as string;
        if (typeof token === 'object') token = evolutionAdminKey();
        qr = extractQr(created.data);
        instance = created.data?.instance?.instanceName || instance;
      } else {
        token = evolutionAdminKey();
      }
      await this.save({
        evolutionInstance: instance,
        evolutionToken: token,
        evolutionStatus: 'connecting',
      });
    }

    const creds: EvolutionCreds = { instance, apiKey: token! };
    const live = await this.whatsapp.status(creds);
    if (live.connected) {
      await this.save({ evolutionStatus: 'open' });
      return { connected: true, qr: null, instance, message: 'Ya está Connected' };
    }

    if (!qr) {
      const conn = await this.whatsapp.adminFetch(
        `/instance/connect/${encodeURIComponent(instance)}`,
        { method: 'GET' },
      );
      if (!conn.ok) {
        throw new BadRequestException(conn.detail || 'No se pudo obtener QR');
      }
      qr = extractQr(conn.data);
    }

    if (!qr) {
      throw new BadRequestException('Sin QR. Revisa la instancia en evoapi Manager.');
    }

    await this.save({ evolutionStatus: 'connecting' });
    const qrSrc = qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
    return {
      connected: false,
      qr: qrSrc,
      instance,
      message: 'Escanea el QR (WhatsApp → Dispositivos vinculados)',
    };
  }

  async setDisplayName(name: string) {
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new BadRequestException('Nombre requerido');
    await this.save({ profileDisplayName: trimmed });
    const creds = await this.getCreds();
    if (!creds) throw new BadRequestException('Vincula una instancia primero');
    const res = await this.whatsapp.updateProfileName(trimmed, creds);
    if (!res.ok) {
      throw new BadRequestException(
        res.error === 'not_open'
          ? 'Sesión no Connected — el nombre se guardó; aplica cuando esté open'
          : (res.detail || res.error),
      );
    }
    return { ok: true, profileDisplayName: trimmed };
  }

  async unlink() {
    await this.save({
      evolutionInstance: null,
      evolutionToken: null,
      evolutionStatus: null,
      evolutionPhone: null,
    });
    return { ok: true, message: 'WhatsApp de plataforma desvinculado (env EVOLUTION_INSTANCE queda como fallback)' };
  }
}
