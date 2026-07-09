import { Injectable } from '@nestjs/common';
import { normalizePhoneDigits, isValidPhone } from '../common/utils/phone.util';

function env(name: string) {
  return String(process.env[name] ?? '').trim().replace(/^["']|["']$/g, '');
}

@Injectable()
export class WhatsAppService {
  configured() {
    return Boolean(env('EVOLUTION_API_URL') && env('EVOLUTION_API_KEY') && env('EVOLUTION_INSTANCE'));
  }

  status() {
    return { whatsapp: this.configured(), ready: this.configured() };
  }

  private async evolutionFetch(path: string, init?: RequestInit) {
    const baseUrl = env('EVOLUTION_API_URL').replace(/\/$/, '');
    const instance = encodeURIComponent(env('EVOLUTION_INSTANCE'));
    const res = await fetch(`${baseUrl}${path.replace('{instance}', instance)}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        apikey: env('EVOLUTION_API_KEY'),
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn('[whatsapp] evolution', path, res.status, detail.slice(0, 200));
      return { ok: false as const, status: res.status, detail };
    }
    const data = await res.json().catch(() => null);
    return { ok: true as const, data };
  }

  async sendText(to: string, text: string) {
    if (!this.configured()) return { ok: false as const, error: 'not_configured' };
    const phone = normalizePhoneDigits(to);
    if (!isValidPhone(phone)) return { ok: false as const, error: 'invalid_phone' };

    const res = await this.evolutionFetch('/message/sendText/{instance}', {
      method: 'POST',
      body: JSON.stringify({ number: phone, text, delay: 1200 }),
    });

    if (!res.ok) return { ok: false as const, error: `http_${res.status}` };
    return { ok: true as const };
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
