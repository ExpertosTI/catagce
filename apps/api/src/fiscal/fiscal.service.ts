import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { fiscalSequences } from '@ghome/db';
import { DRIZZLE } from '../database/database.module';
import { AuthUser } from '../auth/auth.service';
import {
  ComprobanteType, COMPROBANTE_LABELS, formatNcf,
} from './fiscal.util';

@Injectable()
export class FiscalService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async listSequences(user: AuthUser) {
    return this.db.select().from(fiscalSequences)
      .where(eq(fiscalSequences.companyId, user.companyId))
      .orderBy(fiscalSequences.comprobanteType);
  }

  async upsertSequence(user: AuthUser, data: {
    comprobanteType: ComprobanteType;
    rangeFrom: number;
    rangeTo: number;
    currentNumber?: number;
    authorizedUntil?: string;
    isActive?: boolean;
  }) {
    if (data.rangeFrom > data.rangeTo) {
      throw new BadRequestException('El rango inicial no puede ser mayor al final');
    }
    const current = data.currentNumber ?? data.rangeFrom;
    if (current < data.rangeFrom || current > data.rangeTo) {
      throw new BadRequestException('El número actual debe estar dentro del rango autorizado');
    }

    const [existing] = await this.db.select().from(fiscalSequences)
      .where(and(
        eq(fiscalSequences.companyId, user.companyId),
        eq(fiscalSequences.comprobanteType, data.comprobanteType),
      )).limit(1);

    const values = {
      companyId: user.companyId,
      comprobanteType: data.comprobanteType,
      rangeFrom: data.rangeFrom,
      rangeTo: data.rangeTo,
      currentNumber: current,
      authorizedUntil: data.authorizedUntil ? new Date(data.authorizedUntil) : null,
      isActive: data.isActive ?? true,
      updatedAt: new Date(),
    };

    if (existing) {
      const [updated] = await this.db.update(fiscalSequences).set(values)
        .where(eq(fiscalSequences.id, existing.id)).returning();
      return updated;
    }

    const [created] = await this.db.insert(fiscalSequences).values(values).returning();
    return created;
  }

  async allocateNcf(user: AuthUser, type: ComprobanteType): Promise<string> {
    const [seq] = await this.db.select().from(fiscalSequences)
      .where(and(
        eq(fiscalSequences.companyId, user.companyId),
        eq(fiscalSequences.comprobanteType, type),
        eq(fiscalSequences.isActive, true),
      )).limit(1);

    if (!seq) {
      throw new BadRequestException(
        `No hay secuencia NCF activa para ${COMPROBANTE_LABELS[type]}. Configure los rangos en Configuración → Fiscal.`,
      );
    }

    if (seq.authorizedUntil && new Date(seq.authorizedUntil) < new Date()) {
      throw new BadRequestException(`La autorización DGII para ${type} venció el ${new Date(seq.authorizedUntil).toLocaleDateString('es-DO')}`);
    }

    if (seq.currentNumber > seq.rangeTo) {
      throw new BadRequestException(`Secuencia NCF agotada para ${COMPROBANTE_LABELS[type]} (${type})`);
    }

    const ncf = formatNcf(type, seq.currentNumber);

    await this.db.update(fiscalSequences).set({
      currentNumber: seq.currentNumber + 1,
      updatedAt: new Date(),
    }).where(eq(fiscalSequences.id, seq.id));

    return ncf;
  }

  async getSequenceStatus(user: AuthUser, type: ComprobanteType) {
    const [seq] = await this.db.select().from(fiscalSequences)
      .where(and(
        eq(fiscalSequences.companyId, user.companyId),
        eq(fiscalSequences.comprobanteType, type),
      )).limit(1);
    if (!seq) return null;
    return {
      ...seq,
      remaining: Math.max(0, seq.rangeTo - seq.currentNumber + 1),
      nextNcf: seq.currentNumber <= seq.rangeTo ? formatNcf(type, seq.currentNumber) : null,
    };
  }
}
