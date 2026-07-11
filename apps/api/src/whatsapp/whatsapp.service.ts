import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import { normalizePhoneDigits, isValidPhone, phoneSendVariants } from '../common/utils/phone.util';
import {
  EvolutionCreds,
  evolutionAdminKey,
  evolutionBaseUrl,
  evolutionConfigured,
  platformEvolution,
} from './evolution-config';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

type SendResult =
  | { ok: true }
  | { ok: false; error: string; detail?: string };

@Injectable()
export class WhatsAppService {
  configured() {
    return evolutionConfigured() && Boolean(platformEvolution());
  }

  /** Platform can create instances even if default INSTANCE is empty */
  adminConfigured() {
    return evolutionConfigured();
  }

  async status(creds?: EvolutionCreds | null) {
    const c = creds || platformEvolution();
    if (!c || !evolutionBaseUrl()) {
      return { whatsapp: false, ready: false, instance: null, state: null, connected: false };
    }
    const conn = await this.evolutionFetch('/instance/connectionState/{instance}', { method: 'GET' }, c);
    if (!conn.ok && conn.status === 404) {
      return {
        whatsapp: true,
        ready: false,
        instance: c.instance,
        state: 'missing',
        connected: false,
        error: 'instance_not_found',
      };
    }
    const state = conn.ok
      ? (conn.data?.instance?.state || conn.data?.state || conn.data?.status || 'unknown')
      : 'unreachable';
    const ready = conn.ok && String(state).toLowerCase() === 'open';
    return {
      whatsapp: true,
      // Solo "ready" si la sesión está open — no basta con tener credenciales
      ready,
      instance: c.instance,
      state,
      connected: ready,
    };
  }

  private parseEvolutionError(detail: string): string {
    try {
      const json = JSON.parse(detail);
      const msg = json?.message || json?.response?.message || json?.error || json?.response?.message?.[0];
      if (Array.isArray(msg)) return msg.map((m) => (typeof m === 'string' ? m : JSON.stringify(m))).join(', ');
      if (typeof msg === 'string') return msg;
      if (msg && typeof msg === 'object') return JSON.stringify(msg).slice(0, 180);
    } catch {
      // plain text
    }
    return detail.slice(0, 180) || 'Error de Evolution API';
  }

  async evolutionFetch(path: string, init?: RequestInit, creds?: EvolutionCreds | null) {
    const c = creds || platformEvolution();
    if (!c) return { ok: false as const, status: 0, detail: 'not_configured' };
    const baseUrl = evolutionBaseUrl();
    const instance = encodeURIComponent(c.instance);
    const url = `${baseUrl}${path.replace('{instance}', instance)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        signal: init?.signal || AbortSignal.timeout(20_000),
        headers: {
          'Content-Type': 'application/json',
          apikey: c.apiKey,
          ...(init?.headers || {}),
        },
      });
    } catch (err: any) {
      console.warn('[whatsapp] fetch error', path, err?.message);
      return { ok: false as const, status: 0, detail: err?.message || 'network_error' };
    }
    const raw = await res.text().catch(() => '');
    if (!res.ok) {
      console.warn('[whatsapp] evolution', path, res.status, raw.slice(0, 200));
      return { ok: false as const, status: res.status, detail: this.parseEvolutionError(raw) };
    }
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    if (data?.error || data?.status === 'ERROR') {
      return { ok: false as const, status: res.status, detail: this.parseEvolutionError(JSON.stringify(data)) };
    }
    return { ok: true as const, data };
  }

  /** Admin key (global) — create/list instances */
  async adminFetch(path: string, init?: RequestInit) {
    const baseUrl = evolutionBaseUrl();
    const key = evolutionAdminKey();
    if (!baseUrl || !key) return { ok: false as const, status: 0, detail: 'admin_not_configured' };
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: init?.signal || AbortSignal.timeout(20_000),
        headers: {
          'Content-Type': 'application/json',
          apikey: key,
          ...(init?.headers || {}),
        },
      });
    } catch (err: any) {
      return { ok: false as const, status: 0, detail: err?.message || 'network_error' };
    }
    const raw = await res.text().catch(() => '');
    if (!res.ok) {
      console.warn('[whatsapp] admin', path, res.status, raw.slice(0, 200));
      return { ok: false as const, status: res.status, detail: this.parseEvolutionError(raw) };
    }
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    return { ok: true as const, data };
  }

  async createInstance(instanceName: string) {
    return this.adminFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });
  }

  async connectInstance(creds: EvolutionCreds) {
    return this.evolutionFetch('/instance/connect/{instance}', { method: 'GET' }, creds);
  }

  async logoutInstance(creds: EvolutionCreds) {
    return this.evolutionFetch('/instance/logout/{instance}', { method: 'DELETE' }, creds);
  }

  async deleteInstance(instanceName: string) {
    return this.adminFetch(`/instance/delete/${encodeURIComponent(instanceName)}`, { method: 'DELETE' });
  }

  async sendText(to: string, text: string, creds?: EvolutionCreds | null): Promise<SendResult> {
    const c = creds || platformEvolution();
    if (!c) return { ok: false, error: 'not_configured' };
    if (!isValidPhone(normalizePhoneDigits(to))) return { ok: false, error: 'invalid_phone' };

    let lastError = 'send_failed';
    let lastDetail = '';
    for (const number of phoneSendVariants(to)) {
      const res = await this.evolutionFetch('/message/sendText/{instance}', {
        method: 'POST',
        body: JSON.stringify({ number, text }),
      }, c);
      if (res.ok) return { ok: true };
      lastError = res.status ? `http_${res.status}` : 'send_failed';
      lastDetail = res.detail || '';
    }
    return { ok: false, error: lastError, detail: lastDetail };
  }

  private resolveMedia(mediaUrl: string): { media: string; mediatype: string; mimetype: string; fileName: string } | null {
    const match = mediaUrl.match(/\/uploads\/([^/]+)\/([^/?#]+)/);
    if (match) {
      const [, sellerId, filename] = match;
      const filePath = join(UPLOAD_DIR, sellerId, filename);
      if (existsSync(filePath)) {
        const ext = extname(filename).toLowerCase().replace('.', '') || 'jpeg';
        const mimetype = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        return {
          media: readFileSync(filePath).toString('base64'),
          mediatype: 'image',
          mimetype,
          fileName: filename,
        };
      }
      return { media: mediaUrl, mediatype: 'image', mimetype: 'image/jpeg', fileName: filename };
    }
    if (mediaUrl.startsWith('http')) {
      return { media: mediaUrl, mediatype: 'image', mimetype: 'image/jpeg', fileName: 'image.jpg' };
    }
    return null;
  }

  async sendMedia(to: string, opts: { caption?: string; mediaUrl: string }, creds?: EvolutionCreds | null): Promise<SendResult> {
    const c = creds || platformEvolution();
    if (!c) return { ok: false, error: 'not_configured' };
    if (!isValidPhone(normalizePhoneDigits(to))) return { ok: false, error: 'invalid_phone' };

    const resolved = this.resolveMedia(opts.mediaUrl);
    if (!resolved) return { ok: false, error: 'invalid_media', detail: 'Imagen no encontrada' };

    let lastError = 'send_failed';
    let lastDetail = '';
    for (const number of phoneSendVariants(to)) {
      const res = await this.evolutionFetch('/message/sendMedia/{instance}', {
        method: 'POST',
        body: JSON.stringify({
          number,
          mediatype: resolved.mediatype,
          mimetype: resolved.mimetype,
          fileName: resolved.fileName,
          media: resolved.media,
          caption: opts.caption || '',
        }),
      }, c);
      if (res.ok) return { ok: true };
      lastError = res.status ? `http_${res.status}` : 'send_failed';
      lastDetail = res.detail || '';
    }
    return { ok: false, error: lastError, detail: lastDetail };
  }

  async sendBundle(
    to: string,
    opts: { text?: string; mediaUrls?: string[] },
    creds?: EvolutionCreds | null,
  ): Promise<SendResult> {
    const mediaUrls = (opts.mediaUrls || []).filter(Boolean);
    const text = (opts.text || '').trim();

    if (!mediaUrls.length) {
      if (!text) return { ok: false, error: 'empty_message' };
      return this.sendText(to, text, creds);
    }

    for (let i = 0; i < mediaUrls.length; i++) {
      const caption = i === 0 ? text : '';
      const result = await this.sendMedia(to, { mediaUrl: mediaUrls[i], caption }, creds);
      if (!result.ok) return result;
      if (i < mediaUrls.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }
    return { ok: true };
  }

  async findChats(creds?: EvolutionCreds | null) {
    const c = creds || platformEvolution();
    if (!c) return { ok: false as const, error: 'not_configured', chats: [] as any[] };
    const res = await this.evolutionFetch('/chat/findChats/{instance}', { method: 'POST', body: '{}' }, c);
    if (!res.ok) return { ok: false as const, error: `http_${res.status}`, chats: [] as any[] };
    const chats = Array.isArray(res.data) ? res.data : (res.data?.chats ?? res.data?.records ?? []);
    return { ok: true as const, chats };
  }

  async findMessages(remoteJid: string, creds?: EvolutionCreds | null) {
    const c = creds || platformEvolution();
    if (!c) return { ok: false as const, error: 'not_configured', messages: [] as any[] };
    const res = await this.evolutionFetch('/chat/findMessages/{instance}', {
      method: 'POST',
      body: JSON.stringify({ where: { key: { remoteJid } } }),
    }, c);
    if (!res.ok) return { ok: false as const, error: `http_${res.status}`, messages: [] as any[] };
    let raw: any = res.data;
    if (Array.isArray(raw)) {
      // ok
    } else if (Array.isArray(raw?.messages)) {
      raw = raw.messages;
    } else if (Array.isArray(raw?.messages?.records)) {
      raw = raw.messages.records;
    } else if (Array.isArray(raw?.records)) {
      raw = raw.records;
    } else if (Array.isArray(raw?.data)) {
      raw = raw.data;
    } else {
      raw = [];
    }
    return { ok: true as const, messages: raw as any[] };
  }

  async findLabels(creds?: EvolutionCreds | null) {
    const c = creds || platformEvolution();
    if (!c) return { ok: false as const, error: 'not_configured', labels: [] as any[] };
    const res = await this.evolutionFetch('/label/findLabels/{instance}', { method: 'GET' }, c);
    if (!res.ok) return { ok: false as const, error: `http_${res.status}`, labels: [] as any[] };
    const labels = Array.isArray(res.data) ? res.data : (res.data?.labels ?? []);
    return { ok: true as const, labels };
  }

  async handleLabel(number: string, labelId: string, action: 'add' | 'remove', creds?: EvolutionCreds | null) {
    const c = creds || platformEvolution();
    if (!c) return { ok: false as const, error: 'not_configured' };
    const phone = normalizePhoneDigits(number);
    const res = await this.evolutionFetch('/label/handleLabel/{instance}', {
      method: 'POST',
      body: JSON.stringify({ number: phone, labelId, action }),
    }, c);
    if (!res.ok) return { ok: false as const, error: `http_${res.status}` };
    return { ok: true as const };
  }

  /** Register inbound webhook on Evolution instance (MESSAGES_UPSERT etc.) */
  async setInstanceWebhook(creds: EvolutionCreds, webhookUrl: string) {
    const body = {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: true,
        webhookBase64: false,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
        ],
      },
      // Evolution v2 alternate shape
      url: webhookUrl,
      webhook_by_events: true,
      webhookBase64: false,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE',
      ],
    };
    const res = await this.evolutionFetch('/webhook/set/{instance}', {
      method: 'POST',
      body: JSON.stringify(body),
    }, creds);
    if (!res.ok) {
      // Fallback older path
      return this.evolutionFetch('/webhook/instance/{instance}', {
        method: 'POST',
        body: JSON.stringify(body),
      }, creds);
    }
    return res;
  }
}
