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

  async sendText(to: string, text: string) {
    if (!this.configured()) return { ok: false as const, error: 'not_configured' };
    const phone = normalizePhoneDigits(to);
    if (!isValidPhone(phone)) return { ok: false as const, error: 'invalid_phone' };

    const baseUrl = env('EVOLUTION_API_URL').replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(env('EVOLUTION_INSTANCE'))}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: env('EVOLUTION_API_KEY') },
      body: JSON.stringify({ number: phone, text, delay: 1200 }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn('[whatsapp] send failed', res.status, detail.slice(0, 200));
      return { ok: false as const, error: `http_${res.status}` };
    }
    return { ok: true as const };
  }
}
