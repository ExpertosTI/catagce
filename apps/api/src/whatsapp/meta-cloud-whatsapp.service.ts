import { Injectable } from '@nestjs/common';
import { normalizePhoneDigits, isValidPhone } from '../common/utils/phone.util';
import { MetaCloudConfig, metaCloudFromEnv } from './meta-cloud-config';

type SendResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string; detail?: string };

/**
 * Envío oficial vía Graph API (Cloud API).
 * OTP: plantilla AUTHENTICATION aprobada en Meta.
 * Texto libre: solo dentro de ventana 24h o con plantilla utility.
 */
@Injectable()
export class MetaCloudWhatsAppService {
  resolveConfig(overlay?: Partial<MetaCloudConfig> | null): MetaCloudConfig | null {
    const base = metaCloudFromEnv();
    if (!overlay && !base) return null;
    if (!base && overlay?.accessToken && overlay?.phoneNumberId) {
      return {
        accessToken: overlay.accessToken,
        phoneNumberId: overlay.phoneNumberId,
        wabaId: overlay.wabaId,
        otpTemplate: overlay.otpTemplate || 'catagce_otp',
        otpLang: overlay.otpLang || 'es',
        graphVersion: overlay.graphVersion || 'v21.0',
      };
    }
    if (!base) return null;
    return {
      ...base,
      ...(overlay?.accessToken ? { accessToken: overlay.accessToken } : {}),
      ...(overlay?.phoneNumberId ? { phoneNumberId: overlay.phoneNumberId } : {}),
      ...(overlay?.wabaId ? { wabaId: overlay.wabaId } : {}),
      ...(overlay?.otpTemplate ? { otpTemplate: overlay.otpTemplate } : {}),
      ...(overlay?.otpLang ? { otpLang: overlay.otpLang } : {}),
    };
  }

  configured(overlay?: Partial<MetaCloudConfig> | null) {
    return Boolean(this.resolveConfig(overlay));
  }

  async status(overlay?: Partial<MetaCloudConfig> | null) {
    const cfg = this.resolveConfig(overlay);
    if (!cfg) {
      return {
        whatsapp: false,
        ready: false,
        channel: 'cloud' as const,
        connected: false,
        state: 'not_configured',
        instance: null,
        phoneNumberId: null,
      };
    }
    // Cloud API no tiene "QR session"; si hay token+phone id → listo para enviar
    return {
      whatsapp: true,
      ready: true,
      channel: 'cloud' as const,
      connected: true,
      state: 'cloud_ready',
      instance: `meta:${cfg.phoneNumberId}`,
      phoneNumberId: cfg.phoneNumberId,
    };
  }

  private async graphPost(cfg: MetaCloudConfig, path: string, body: unknown): Promise<SendResult> {
    const url = `https://graph.facebook.com/${cfg.graphVersion}/${path}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(20_000),
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const raw = await res.text().catch(() => '');
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
      if (!res.ok) {
        const err =
          data?.error?.message
          || data?.error?.error_user_msg
          || (typeof data === 'string' ? data : raw).slice(0, 200);
        console.warn('[meta-wa]', res.status, err);
        return { ok: false, error: `http_${res.status}`, detail: String(err) };
      }
      const messageId = data?.messages?.[0]?.id;
      return { ok: true, messageId };
    } catch (e: any) {
      return { ok: false, error: 'network_error', detail: e?.message || 'fetch failed' };
    }
  }

  /** Plantilla AUTHENTICATION (OTP). Requiere plantilla aprobada en Meta Business. */
  async sendOtp(to: string, code: string, overlay?: Partial<MetaCloudConfig> | null): Promise<SendResult> {
    const cfg = this.resolveConfig(overlay);
    if (!cfg) return { ok: false, error: 'not_configured' };
    const phone = normalizePhoneDigits(to);
    if (!isValidPhone(phone)) return { ok: false, error: 'invalid_phone' };
    const otp = String(code || '').trim();
    if (!otp || otp.length > 15) return { ok: false, error: 'invalid_otp' };

    return this.graphPost(cfg, `${cfg.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: cfg.otpTemplate,
        language: { code: cfg.otpLang },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: otp }],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: otp }],
          },
        ],
      },
    });
  }

  /** Texto libre (ventana 24h) o fallará fuera de sesión — para tests / respuestas. */
  async sendText(to: string, text: string, overlay?: Partial<MetaCloudConfig> | null): Promise<SendResult> {
    const cfg = this.resolveConfig(overlay);
    if (!cfg) return { ok: false, error: 'not_configured' };
    const phone = normalizePhoneDigits(to);
    if (!isValidPhone(phone)) return { ok: false, error: 'invalid_phone' };
    const body = String(text || '').slice(0, 4000);
    if (!body) return { ok: false, error: 'empty_text' };

    return this.graphPost(cfg, `${cfg.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { preview_url: false, body },
    });
  }

  /** Plantilla utility genérica (1 body param) — avisos admin si está configurada. */
  async sendUtilityTemplate(
    to: string,
    templateName: string,
    lang: string,
    bodyParams: string[],
    overlay?: Partial<MetaCloudConfig> | null,
  ): Promise<SendResult> {
    const cfg = this.resolveConfig(overlay);
    if (!cfg) return { ok: false, error: 'not_configured' };
    const phone = normalizePhoneDigits(to);
    if (!isValidPhone(phone)) return { ok: false, error: 'invalid_phone' };

    return this.graphPost(cfg, `${cfg.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: lang || cfg.otpLang },
        components: bodyParams.length
          ? [{
              type: 'body',
              parameters: bodyParams.map((t) => ({ type: 'text', text: String(t).slice(0, 1024) })),
            }]
          : [],
      },
    });
  }
}
