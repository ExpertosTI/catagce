import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import { normalizePhoneDigits, isValidPhone, phoneSendVariants } from '../common/utils/phone.util';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

function env(name: string) {
  return String(process.env[name] ?? '').trim().replace(/^["']|["']$/g, '');
}

type SendResult =
  | { ok: true }
  | { ok: false; error: string; detail?: string };

@Injectable()
export class WhatsAppService {
  configured() {
    return Boolean(env('EVOLUTION_API_URL') && env('EVOLUTION_API_KEY') && env('EVOLUTION_INSTANCE'));
  }

  async status() {
    const configured = this.configured();
    if (!configured) {
      return { whatsapp: false, ready: false, instance: null, state: null };
    }
    const instance = env('EVOLUTION_INSTANCE');
    const conn = await this.evolutionFetch('/instance/connectionState/{instance}', { method: 'GET' });
    const state = conn.ok
      ? (conn.data?.instance?.state || conn.data?.state || conn.data?.status || 'unknown')
      : 'unreachable';
    const ready = conn.ok && String(state).toLowerCase() === 'open';
    return {
      whatsapp: true,
      ready: ready || configured,
      instance,
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

  private async evolutionFetch(path: string, init?: RequestInit) {
    const baseUrl = env('EVOLUTION_API_URL').replace(/\/$/, '');
    const instance = encodeURIComponent(env('EVOLUTION_INSTANCE'));
    const url = `${baseUrl}${path.replace('{instance}', instance)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          apikey: env('EVOLUTION_API_KEY'),
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
      const detail = this.parseEvolutionError(JSON.stringify(data));
      return { ok: false as const, status: res.status, detail };
    }
    return { ok: true as const, data };
  }

  async sendText(to: string, text: string): Promise<SendResult> {
    if (!this.configured()) return { ok: false, error: 'not_configured' };
    if (!isValidPhone(normalizePhoneDigits(to))) return { ok: false, error: 'invalid_phone' };

    let lastError = 'send_failed';
    let lastDetail = '';
    for (const number of phoneSendVariants(to)) {
      const res = await this.evolutionFetch('/message/sendText/{instance}', {
        method: 'POST',
        body: JSON.stringify({ number, text }),
      });
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
      console.warn('[whatsapp] upload file missing on disk', filePath);
      // Prefer public URL so Evolution can fetch it
      return {
        media: mediaUrl,
        mediatype: 'image',
        mimetype: 'image/jpeg',
        fileName: filename,
      };
    }
    if (mediaUrl.startsWith('http')) {
      return { media: mediaUrl, mediatype: 'image', mimetype: 'image/jpeg', fileName: 'image.jpg' };
    }
    return null;
  }

  async sendMedia(to: string, opts: { caption?: string; mediaUrl: string }): Promise<SendResult> {
    if (!this.configured()) return { ok: false, error: 'not_configured' };
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
      });
      if (res.ok) return { ok: true };
      lastError = res.status ? `http_${res.status}` : 'send_failed';
      lastDetail = res.detail || '';
    }
    console.warn('[whatsapp] sendMedia failed', lastError, lastDetail);
    return { ok: false, error: lastError, detail: lastDetail };
  }

  /** Text + N images for one contact (caption on first image or as text if no images). */
  async sendBundle(to: string, opts: { text?: string; mediaUrls?: string[] }): Promise<SendResult> {
    const mediaUrls = (opts.mediaUrls || []).filter(Boolean);
    const text = (opts.text || '').trim();

    if (!mediaUrls.length) {
      if (!text) return { ok: false, error: 'empty_message' };
      return this.sendText(to, text);
    }

    for (let i = 0; i < mediaUrls.length; i++) {
      const caption = i === 0 ? text : '';
      const result = await this.sendMedia(to, { mediaUrl: mediaUrls[i], caption });
      if (!result.ok) return result;
      if (i < mediaUrls.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    return { ok: true };
  }

  async findChats() {
    if (!this.configured()) return { ok: false as const, error: 'not_configured', chats: [] as any[] };
    const res = await this.evolutionFetch('/chat/findChats/{instance}', { method: 'POST', body: '{}' });
    if (!res.ok) return { ok: false as const, error: `http_${res.status}`, chats: [] as any[] };
    const chats = Array.isArray(res.data) ? res.data : (res.data?.chats ?? res.data?.records ?? []);
    return { ok: true as const, chats };
  }

  async findMessages(remoteJid: string) {
    if (!this.configured()) return { ok: false as const, error: 'not_configured', messages: [] as any[] };
    const res = await this.evolutionFetch('/chat/findMessages/{instance}', {
      method: 'POST',
      body: JSON.stringify({ where: { key: { remoteJid } } }),
    });
    if (!res.ok) return { ok: false as const, error: `http_${res.status}`, messages: [] as any[] };
    const messages = Array.isArray(res.data)
      ? res.data
      : (res.data?.messages ?? res.data?.records ?? []);
    return { ok: true as const, messages };
  }

  async findLabels() {
    if (!this.configured()) return { ok: false as const, error: 'not_configured', labels: [] as any[] };
    const res = await this.evolutionFetch('/label/findLabels/{instance}', { method: 'GET' });
    if (!res.ok) return { ok: false as const, error: `http_${res.status}`, labels: [] as any[] };
    const labels = Array.isArray(res.data) ? res.data : (res.data?.labels ?? []);
    return { ok: true as const, labels };
  }

  async handleLabel(number: string, labelId: string, action: 'add' | 'remove') {
    if (!this.configured()) return { ok: false as const, error: 'not_configured' };
    const phone = normalizePhoneDigits(number);
    const res = await this.evolutionFetch('/label/handleLabel/{instance}', {
      method: 'POST',
      body: JSON.stringify({ number: phone, labelId, action }),
    });
    if (!res.ok) return { ok: false as const, error: `http_${res.status}` };
    return { ok: true as const };
  }
}
