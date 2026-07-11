import {
  Injectable, Inject, BadRequestException, ConflictException, OnModuleInit,
} from '@nestjs/common';
import { eq, desc, asc } from 'drizzle-orm';
import { createHash } from 'crypto';
import {
  nameSurveyMeta, nameSurveyOptions, nameSurveyVotes, nameSurveySuggestions,
} from '@catagce/db';
import { DRIZZLE } from '../database/database.module';

const DEFAULT_NAMES = ['CatDif', 'RenDif', 'Catadif', 'Difcata', 'Cataluz'];

@Injectable()
export class SurveyService implements OnModuleInit {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async onModuleInit() {
    await this.ensureSeed();
  }

  async ensureSeed() {
    try {
      for (let i = 0; i < DEFAULT_NAMES.length; i++) {
        await this.db
          .insert(nameSurveyOptions)
          .values({ name: DEFAULT_NAMES[i], sortOrder: i + 1 })
          .onConflictDoNothing();
      }
      const meta = await this.db.select().from(nameSurveyMeta).limit(1);
      if (!meta.length) {
        const endsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await this.db.insert(nameSurveyMeta).values({ isOpen: true, endsAt });
      }
    } catch (err) {
      console.warn('[survey] ensureSeed skipped:', (err as Error).message);
    }
  }

  private async getMeta() {
    const [meta] = await this.db.select().from(nameSurveyMeta).orderBy(nameSurveyMeta.id).limit(1);
    if (!meta) {
      const endsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const [created] = await this.db.insert(nameSurveyMeta).values({ isOpen: true, endsAt }).returning();
      return created;
    }
    return meta;
  }

  isSurveyOpen(meta: { isOpen: boolean; endsAt: Date | string }) {
    if (!meta.isOpen) return false;
    return new Date(meta.endsAt).getTime() > Date.now();
  }

  async getPublicSurvey() {
    const meta = await this.getMeta();
    const options = await this.db
      .select()
      .from(nameSurveyOptions)
      .where(eq(nameSurveyOptions.isActive, true))
      .orderBy(asc(nameSurveyOptions.sortOrder));
    return {
      isOpen: this.isSurveyOpen(meta),
      endsAt: meta.endsAt,
      options: options.map((o: any) => ({ id: o.id, name: o.name, sortOrder: o.sortOrder })),
    };
  }

  hashVoterKey(raw: string) {
    return createHash('sha256').update(String(raw || '').trim().toLowerCase()).digest('hex');
  }

  async vote(body: { voterKey: string; rank1: string; rank2: string; rank3: string }) {
    const meta = await this.getMeta();
    if (!this.isSurveyOpen(meta)) throw new BadRequestException('La encuesta está cerrada');

    const { rank1, rank2, rank3 } = body;
    if (!rank1 || !rank2 || !rank3) throw new BadRequestException('Debes elegir 3 nombres en orden');
    if (new Set([rank1, rank2, rank3]).size !== 3) {
      throw new BadRequestException('Los 3 nombres deben ser distintos');
    }

    const voterKey = this.hashVoterKey(body.voterKey);
    if (!voterKey || voterKey.length < 16) throw new BadRequestException('voterKey inválido');

    try {
      const [row] = await this.db
        .insert(nameSurveyVotes)
        .values({ voterKey, rank1, rank2, rank3 })
        .returning();
      return { ok: true, id: row.id };
    } catch (err: any) {
      if (String(err?.message || '').includes('unique') || err?.code === '23505') {
        throw new ConflictException('Ya votaste en esta encuesta');
      }
      throw err;
    }
  }

  async suggest(body: { voterKey: string; suggestion: string }) {
    const meta = await this.getMeta();
    if (!this.isSurveyOpen(meta)) throw new BadRequestException('La encuesta está cerrada');

    const suggestion = String(body.suggestion || '').trim().slice(0, 80);
    if (suggestion.length < 2) throw new BadRequestException('Sugiere un nombre (mín. 2 caracteres)');

    const voterKey = this.hashVoterKey(body.voterKey);
    const [row] = await this.db
      .insert(nameSurveySuggestions)
      .values({ voterKey, suggestion })
      .returning();
    return { ok: true, id: row.id };
  }

  async getStats() {
    const options = await this.db.select().from(nameSurveyOptions).where(eq(nameSurveyOptions.isActive, true));
    const votes = await this.db.select().from(nameSurveyVotes);
    const suggestions = await this.db
      .select()
      .from(nameSurveySuggestions)
      .orderBy(desc(nameSurveySuggestions.createdAt))
      .limit(50);

    const byId: Record<string, { id: string; name: string; points: number; first: number; second: number; third: number }> = {};
    for (const o of options) {
      byId[o.id] = { id: o.id, name: o.name, points: 0, first: 0, second: 0, third: 0 };
    }

    for (const v of votes) {
      if (byId[v.rank1]) { byId[v.rank1].points += 3; byId[v.rank1].first += 1; }
      if (byId[v.rank2]) { byId[v.rank2].points += 2; byId[v.rank2].second += 1; }
      if (byId[v.rank3]) { byId[v.rank3].points += 1; byId[v.rank3].third += 1; }
    }

    const ranking = Object.values(byId).sort((a, b) => b.points - a.points || b.first - a.first);
    const meta = await this.getMeta();

    return {
      isOpen: this.isSurveyOpen(meta),
      endsAt: meta.endsAt,
      totalVotes: votes.length,
      ranking,
      suggestions: suggestions.map((s: any) => ({
        id: s.id,
        suggestion: s.suggestion,
        createdAt: s.createdAt,
      })),
    };
  }

  async getAdminState() {
    const survey = await this.getPublicSurvey();
    const stats = await this.getStats();
    return { ...survey, ...stats };
  }

  async updateMeta(body: { isOpen?: boolean; endsAt?: string; extendDays?: number }) {
    const meta = await this.getMeta();
    let endsAt = meta.endsAt ? new Date(meta.endsAt) : new Date();
    if (body.endsAt) endsAt = new Date(body.endsAt);
    if (body.extendDays && body.extendDays > 0) {
      endsAt = new Date(Date.now() + body.extendDays * 24 * 60 * 60 * 1000);
    }
    const [updated] = await this.db
      .update(nameSurveyMeta)
      .set({
        isOpen: body.isOpen ?? meta.isOpen,
        endsAt,
        updatedAt: new Date(),
      })
      .where(eq(nameSurveyMeta.id, meta.id))
      .returning();
    return updated;
  }
}
