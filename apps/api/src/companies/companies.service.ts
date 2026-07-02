import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { companies } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';

function maskGeminiKey(key: string): string {
  const k = key.trim();
  if (!k) return '';
  if (k.length <= 8) return '••••••••';
  return '••••••••' + k.slice(-4);
}

function sanitizeCompanyForClient(company: Record<string, unknown>) {
  const settings = (company.settings ?? {}) as Record<string, unknown>;
  const rawKey = settings.geminiApiKey;
  const hasGeminiKey = typeof rawKey === 'string' && rawKey.length > 0;
  return {
    ...company,
    settings: {
      ...settings,
      geminiApiKey: hasGeminiKey ? maskGeminiKey(String(rawKey)) : '',
      hasGeminiKey,
    },
  };
}

@Injectable()
export class CompaniesService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async getMine(user: AuthUser) {
    const [company] = await this.db.select().from(companies)
      .where(eq(companies.id, user.companyId)).limit(1);
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return sanitizeCompanyForClient(company);
  }

  async update(user: AuthUser, data: {
    name?: string; taxId?: string; email?: string; phone?: string;
    address?: string; logoUrl?: string;
    settings?: Record<string, unknown>;
  }) {
    const [current] = await this.db.select().from(companies)
      .where(eq(companies.id, user.companyId)).limit(1);
    if (!current) throw new NotFoundException('Empresa no encontrada');

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.taxId !== undefined) updates.taxId = data.taxId;
    if (data.email !== undefined) updates.email = data.email;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.address !== undefined) updates.address = data.address;
    if (data.logoUrl !== undefined) updates.logoUrl = data.logoUrl;
    if (data.settings !== undefined) {
      const currentSettings = (current.settings as Record<string, unknown>) ?? {};
      const merged = { ...currentSettings, ...data.settings };
      if (data.settings.geminiApiKey !== undefined) {
        const incoming = String(data.settings.geminiApiKey ?? '');
        if (incoming.includes('•')) {
          merged.geminiApiKey = currentSettings.geminiApiKey;
        } else if (!incoming.trim()) {
          delete merged.geminiApiKey;
        } else {
          merged.geminiApiKey = incoming.trim();
        }
      }
      updates.settings = merged;
    }

    const [updated] = await this.db.update(companies).set(updates)
      .where(eq(companies.id, user.companyId)).returning();
    return sanitizeCompanyForClient(updated);
  }
}
