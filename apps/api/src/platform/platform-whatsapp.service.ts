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
import { encryptSecret, resolveStoredSecret } from '../common/security/crypto.util';

const DEFAULT_INSTANCE = 'catagce-platform';
const DEFAULT_DISPLAY = 'Catagce';

function extractQr(data: any): string | null {
  return (
    data?.qrcode?.base64
    || data?.base64
    || data?.qrcode?.code
    || data?.code
    || null
  );
}

function phoneFromJid(jid: string | null | undefined): string | null {
  if (!jid) return null;
  const digits = String(jid).split('@')[0].replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}

function phoneFromInstanceRow(row: any): string | null {
  if (!row || typeof row !== 'object') return null;
  return (
    phoneFromJid(row.ownerJid || row.owner || row.wuid || row.wid)
    || (row.number ? String(row.number).replace(/\D/g, '') : null)
    || phoneFromJid(row.instance?.ownerJid)
    || null
  );
}

/** WhatsApp de uso general (OTP, avisos platform) — lo configura el platform admin vía QR. */
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
      await this.db.insert(platformSettings).values({
        id: 1,
        profileDisplayName: DEFAULT_DISPLAY,
        notifyChannel: 'evolution',
      });
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

  private async detectLinkedPhone(instance: string): Promise<string | null> {
    const probe = await this.whatsapp.adminFetch('/instance/fetchInstances', { method: 'GET' });
    if (!probe.ok || !probe.data) return null;
    const list = Array.isArray(probe.data) ? probe.data : [probe.data];
    for (const item of list) {
      const name =
        item?.instance?.instanceName
        || item?.instanceName
        || item?.name
        || item?.instance;
      if (String(name) === instance) {
        return phoneFromInstanceRow(item) || phoneFromInstanceRow(item?.instance);
      }
    }
    return null;
  }

  async getCreds(): Promise<EvolutionCreds | null> {
    return this.whatsapp.resolvePlatformCreds();
  }

  async status() {
    const settings = await this.row();
    const preferCloud = await this.whatsapp.preferCloudChannel();
    const live = await this.whatsapp.status();

    let phone = settings?.evolutionPhone || null;

    if (!preferCloud && settings?.evolutionInstance) {
      const creds = await this.getCreds();
      if (creds) {
        const evo = await this.whatsapp.status(creds);
        if (evo.connected) {
          if (settings.evolutionStatus !== 'open') {
            await this.save({ evolutionStatus: 'open' });
          }
          if (!phone) {
            phone = await this.detectLinkedPhone(creds.instance);
            if (phone) await this.save({ evolutionPhone: phone });
          }
        } else if (settings.evolutionStatus === 'open') {
          await this.save({ evolutionStatus: String(evo.state || 'unknown') });
        }
      }
    }

    const linked = Boolean(settings?.evolutionInstance) || preferCloud;
    const connected = Boolean(live.ready);

    return {
      platformOk: this.whatsapp.configured(),
      channel: (live as any).channel || (preferCloud ? 'cloud' : 'evolution'),
      linked,
      connected,
      state: live.state,
      instance: settings?.evolutionInstance || live.instance || null,
      phone,
      profileDisplayName: settings?.profileDisplayName || DEFAULT_DISPLAY,
      notifyChannel: settings?.notifyChannel || process.env.META_WA_NOTIFY_CHANNEL || 'evolution',
      meta: {
        configured: preferCloud || Boolean(settings?.metaPhoneNumberId || process.env.META_WA_PHONE_NUMBER_ID),
        phoneNumberId: settings?.metaPhoneNumberId || process.env.META_WA_PHONE_NUMBER_ID || null,
        wabaId: settings?.metaWabaId || process.env.META_WA_WABA_ID || null,
        otpTemplate: settings?.metaOtpTemplate || process.env.META_WA_OTP_TEMPLATE || 'catagce_otp',
        otpLang: settings?.metaOtpLang || process.env.META_WA_OTP_LANG || 'es',
        notifyTemplate: settings?.metaNotifyTemplate || process.env.META_WA_NOTIFY_TEMPLATE || null,
        hasToken: Boolean(settings?.metaAccessToken || process.env.META_WA_ACCESS_TOKEN),
      },
      message: connected
        ? ((live as any).channel === 'cloud'
          ? 'Cloud API listo — OTP/avisos por número oficial Meta'
          : `Notificaciones activas${phone ? ` desde +${phone}` : ''} — escaneado por admin`)
        : settings?.evolutionInstance
          ? 'Instancia vinculada — escanea el QR para conectar el número de notificaciones'
          : 'Escanea un QR para elegir el número que enviará OTP y avisos',
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
    return { ok: true, masked: phone.slice(-4), note: 'Si llegó el OTP de prueba, el canal de notificaciones está OK (código de test no sirve para login).' };
  }

  /** Vincular instancia ya existente en evoapi (nombre libre; sin hardcode). */
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

    const profileDisplayName = String(displayName || DEFAULT_DISPLAY).trim() || DEFAULT_DISPLAY;
    await this.save({
      evolutionInstance: instance,
      evolutionToken: encryptSecret(key),
      evolutionStatus: 'unknown',
      evolutionPhone: null,
      profileDisplayName,
      notifyChannel: 'evolution',
    });

    const creds: EvolutionCreds = { instance, apiKey: key };
    const live = await this.whatsapp.status(creds);
    const phone = live.connected ? await this.detectLinkedPhone(instance) : null;
    await this.save({
      evolutionStatus: String(live.state || 'unknown'),
      ...(phone ? { evolutionPhone: phone } : {}),
    });

    if (live.connected && profileDisplayName) {
      await this.whatsapp.updateProfileName(profileDisplayName, creds).catch(() => null);
    }

    return this.status();
  }

  /**
   * QR para que el admin escanee el número que enviará OTP/avisos.
   * Usa la instancia vinculada o crea catagce-platform.
   */
  async startQr(opts?: { fresh?: boolean }) {
    if (!evolutionConfigured()) {
      throw new BadRequestException('Evolution API no está configurada en el servidor');
    }

    if (opts?.fresh) {
      await this.save({
        evolutionInstance: null,
        evolutionToken: null,
        evolutionStatus: null,
        evolutionPhone: null,
      });
    }

    const settings = await this.row();
    let instance = settings?.evolutionInstance || DEFAULT_INSTANCE;
    let tokenPlain =
      resolveStoredSecret(settings?.evolutionToken) || evolutionAdminKey() || '';
    let qr: string | null = null;

    if (!settings?.evolutionInstance || opts?.fresh) {
      instance = DEFAULT_INSTANCE;
      const created = await this.whatsapp.createInstance(instance);
      if (created.ok) {
        tokenPlain = (created.data?.hash?.apikey || created.data?.hash || evolutionAdminKey()) as string;
        if (typeof tokenPlain === 'object') tokenPlain = evolutionAdminKey() || '';
        qr = extractQr(created.data);
        instance = created.data?.instance?.instanceName || instance;
      } else {
        // Puede existir: reutilizar y pedir connect
        tokenPlain = evolutionAdminKey() || '';
        const connExisting = await this.whatsapp.adminFetch(
          `/instance/connect/${encodeURIComponent(instance)}`,
          { method: 'GET' },
        );
        if (connExisting.ok) qr = extractQr(connExisting.data);
      }
      await this.save({
        evolutionInstance: instance,
        evolutionToken: encryptSecret(String(tokenPlain)),
        evolutionStatus: 'connecting',
        evolutionPhone: null,
        notifyChannel: 'evolution',
        profileDisplayName: settings?.profileDisplayName || DEFAULT_DISPLAY,
      });
    }

    if (!tokenPlain) {
      throw new BadRequestException('Token Evolution no disponible (revisa ENCRYPTION_KEY o re-vincula)');
    }

    const creds: EvolutionCreds = { instance, apiKey: tokenPlain };
    const live = await this.whatsapp.status(creds);
    if (live.connected) {
      const phone = await this.detectLinkedPhone(instance);
      await this.save({
        evolutionStatus: 'open',
        notifyChannel: 'evolution',
        ...(phone ? { evolutionPhone: phone } : {}),
      });
      return {
        connected: true,
        qr: null,
        instance,
        phone,
        message: phone
          ? `Ya Connected — notificaciones desde +${phone}`
          : 'Ya está Connected',
      };
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

    await this.save({ evolutionStatus: 'connecting', notifyChannel: 'evolution' });
    const qrSrc = qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
    return {
      connected: false,
      qr: qrSrc,
      instance,
      phone: null,
      message: 'Escanea con el WhatsApp que usaremos para OTP y avisos (Dispositivos vinculados)',
    };
  }

  async setDisplayName(name: string) {
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new BadRequestException('Nombre requerido');
    await this.save({ profileDisplayName: trimmed });
    const creds = await this.getCreds();
    if (!creds) throw new BadRequestException('Vincula o escanea un número primero');
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
    return {
      ok: true,
      message: 'WhatsApp de notificaciones desvinculado. Escanea un QR para elegir otro número.',
    };
  }
}
