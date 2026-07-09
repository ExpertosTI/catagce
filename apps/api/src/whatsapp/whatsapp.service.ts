import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { companies } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { resolveCompanyNotifyPhone } from './company-notify-phone.util';
import { isValidPhone, maskPhone, normalizePhoneDigits } from './phone.util';

function env(name: string, fallback = '') {
  return String(process.env[name] ?? fallback).trim().replace(/^["']|["']$/g, '');
}

@Injectable()
export class WhatsAppService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  evolutionConfigured() {
    return Boolean(
      env('EVOLUTION_API_URL') && env('EVOLUTION_API_KEY') && env('EVOLUTION_INSTANCE'),
    );
  }

  status() {
    return {
      evolution: this.evolutionConfigured(),
      instance: env('EVOLUTION_INSTANCE') || null,
    };
  }

  async adminPhoneForCompany(companyId: string) {
    const [row] = await this.db.select({ phone: companies.phone })
      .from(companies).where(eq(companies.id, companyId)).limit(1);
    return resolveCompanyNotifyPhone(row?.phone);
  }

  async adminPhoneStatus(companyId: string) {
    const phone = await this.adminPhoneForCompany(companyId);
    return {
      configured: isValidPhone(phone),
      masked: phone ? maskPhone(phone) : null,
      source: 'companies.phone',
    };
  }

  async sendText(to: string, text: string) {
    if (!this.evolutionConfigured()) return { ok: false as const, error: 'evolution_not_configured' };
    const phone = normalizePhoneDigits(to);
    if (!isValidPhone(phone)) return { ok: false as const, error: 'invalid_phone' };

    const baseUrl = env('EVOLUTION_API_URL').replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(env('EVOLUTION_INSTANCE'))}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: env('EVOLUTION_API_KEY') },
      body: JSON.stringify({ number: phone, text }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn('[whatsapp] send failed', res.status, detail.slice(0, 200));
      return { ok: false as const, error: `http_${res.status}` };
    }
    return { ok: true as const };
  }

  async sendAdmin(companyId: string, text: string) {
    const to = await this.adminPhoneForCompany(companyId);
    if (!isValidPhone(to)) {
      return { ok: false as const, error: 'admin_phone_missing' };
    }
    return this.sendText(to, text);
  }
}
