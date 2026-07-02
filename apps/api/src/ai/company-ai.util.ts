import { eq } from 'drizzle-orm';
import { companies } from '@ghome/db';

export async function getCompanyGeminiKey(db: any, companyId: string): Promise<string | null> {
  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  const key = (company?.settings as { geminiApiKey?: string } | null)?.geminiApiKey;
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}
