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
import { encryptSecret } from '../common/security/crypto.util';

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
    const settings = await this.row();
    const live = await this.whatsapp.status();
    const preferCloud = await this.whatsapp.preferCloudChannel();

    if (!preferCloud && settings?.evolutionInstance) {
      const creds = await this.getCreds();
      if (creds) {
        const evo = await this.whatsapp.status(creds);
        if (evo.connected && settings.evolutionStatus !== 'open') {
          await this.save({ evolutionStatus: 'open' });
        } else if (!evo.connected && settings.evolutionStatus === 'open') {
          await this.save({ evolutionStatus: String(evo.state || 'unknown') });
        }
      }
    }

    return {
      platformOk: this.whatsapp.configured(),
      channel: (live as any).channel || (preferCloud ? 'cloud' : 'evolution'),
      linked: Boolean(settings?.evolutionInstance) || preferCloud,
      connected: Boolean(live.ready),
      state: live.state,
      instance: live.instance,
      phone: settings?.evolutionPhone || null,
      profileDisplayName: settings?.profileDisplayName || 'RENACE.TECH',
      notifyChannel: settings?.notifyChannel || process.env.META_WA_NOTIFY_CHANNEL || 'cloud',
      meta: {
        configured: preferCloud || Boolean(settings?.metaPhoneNumberId || process.env.META_WA_PHONE_NUMBER_ID),
        phoneNumberId: settings?.metaPhoneNumberId || process.env.META_WA_PHONE_NUMBER_ID || null,
        wabaId: settings?.metaWabaId || process.env.META_WA_WABA_ID || null,
        otpTemplate: settings?.metaOtpTemplate || process.env.META_WA_OTP_TEMPLATE || 'catagce_otp',
        otpLang: settings?.metaOtpLang || process.env.META_WA_OTP_LANG || 'es',
        notifyTemplate: settings?.metaNotifyTemplate || process.env.META_WA_NOTIFY_TEMPLATE || null,
        hasToken: Boolean(settings?.metaAccessToken || process.env.META_WA_ACCESS_TOKEN),
      },
      message: live.ready
        ? ((live as any).channel === 'cloud'
          ? 'Cloud API listo — OTP/avisos por número oficial Meta'
          : 'Evolution Connected — listo')
        : 'Configura Cloud API (recomendado) o conecta Evolution',
    };
  }

  async saveCloud(body: {
    accessToken?: string;
    phoneNumberId: string;
    wabaId?: string;
    otpTemplate?: string;
    otpLang?: string;
    notifyTemplate?: string;
    notifyChannel?: string;
  }) {
    const phoneNumberId = String(body.phoneNumberId || '').trim();
    if (!phoneNumberId) throw new BadRequestException('Phone Number ID requerido');

    const patch: Record<string, unknown> = {
      metaPhoneNumberId: phoneNumberId,
      metaWabaId: body.wabaId?.trim() || null,
      metaOtpTemplate: body.otpTemplate?.trim() || 'catagce_otp',
      metaOtpLang: body.otpLang?.trim() || 'es',
      metaNotifyTemplate: body.notifyTemplate?.trim() || null,
      notifyChannel: body.notifyChannel === 'evolution' ? 'evolution' : 'cloud',
    };
    if (body.accessToken?.trim()) {
      patch.metaAccessToken = encryptSecret(body.accessToken.trim());
    } else if (!process.env.META_WA_ACCESS_TOKEN && !(await this.row())?.metaAccessToken) {
      throw new BadRequestException('Access token requerido (o META_WA_ACCESS_TOKEN en .env)');
    }

    await this.save(patch);
    return this.status();
  }

  async testCloudOtp(phone: string) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const sent = await this.whatsapp.sendPlatformOtp(phone, code);
    if (!sent.ok) {
      throw new BadRequestException(sent.detail || sent.error || 'Envío falló');
    }
    return { ok: true, masked: phone.slice(-4), note: 'Si llegó el OTP de prueba, Cloud API está OK (código de test no sirve para login).' };
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
      evolutionToken: encryptSecret(key),
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
        evolutionToken: encryptSecret(String(token)),
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
