import { Injectable, Inject, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, and, gt, desc } from 'drizzle-orm';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { verificationCodes } from '@catagce/db';
import { DRIZZLE } from '../database/database.module';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { RedisService } from '../common/redis/redis.service';
import {
  isValidPhone,
  maskPhone,
  normalizePhoneDigits,
  phoneValidationMessage,
} from '../common/utils/phone.util';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MS = 15 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class VerificationService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private whatsapp: WhatsAppService,
    private jwt: JwtService,
    private redis: RedisService,
  ) {}

  private async assertSendRate(phone: string) {
    const key = `otp:send:${phone}`;
    let hits = 0;
    try {
      hits = await this.redis.incrWithTtl(key, SEND_WINDOW_MS);
    } catch {
      // Redis caído: no bloquear OTP, pero tampoco abrir flood infinito en esta réplica
      hits = 1;
    }
    if (hits > MAX_SENDS_PER_WINDOW) {
      throw new HttpException('Demasiados intentos. Espere unos minutos.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async sendCode(phoneRaw: string, purpose: 'register' | 'login') {
    const phone = normalizePhoneDigits(phoneRaw);
    const phoneErr = phoneValidationMessage(phoneRaw);
    if (phoneErr || !isValidPhone(phone)) {
      throw new BadRequestException(phoneErr || 'Número de WhatsApp inválido');
    }
    if (!this.whatsapp.configured()) {
      throw new BadRequestException('WhatsApp no está disponible en este momento');
    }
    const wa = await this.whatsapp.status();
    if (!wa.ready) {
      throw new BadRequestException(
        wa.channel === 'cloud'
          ? 'WhatsApp Cloud API no está listo. Revisa token / Phone Number ID / plantilla OTP en Admin → WhatsApp.'
          : `WhatsApp de plataforma no conectado (estado: ${wa.state || 'desconocido'}). Configura Cloud API o reconecta Evolution.`,
      );
    }

    await this.assertSendRate(phone);

    const code = String(randomInt(100000, 999999));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.db.delete(verificationCodes).where(and(
      eq(verificationCodes.phone, phone),
      eq(verificationCodes.purpose, purpose),
    ));

    await this.db.insert(verificationCodes).values({
      phone, codeHash, purpose, expiresAt, attempts: 0,
    });

    const sent = await this.whatsapp.sendPlatformOtp(phone, code);
    if (!sent.ok) {
      let detail: string;
      if (sent.error === 'not_configured') {
        detail = 'WhatsApp no está configurado en el servidor';
      } else if (sent.error === 'invalid_phone') {
        detail = 'Número inválido. En RD usa 809, 829 o 849 (10 dígitos)';
      } else {
        detail = `No se pudo enviar el código (${sent.error}${sent.detail ? `: ${sent.detail.slice(0, 120)}` : ''}).`;
      }
      throw new BadRequestException(detail);
    }

    return { ok: true, masked: maskPhone(phone), expiresInSec: CODE_TTL_MS / 1000 };
  }

  async verifyCode(phoneRaw: string, code: string, purpose: 'register' | 'login') {
    const phone = normalizePhoneDigits(phoneRaw);
    if (!isValidPhone(phone) || !/^\d{6}$/.test(code)) {
      throw new BadRequestException('Código inválido');
    }

    const [row] = await this.db.select().from(verificationCodes).where(and(
      eq(verificationCodes.phone, phone),
      eq(verificationCodes.purpose, purpose),
      gt(verificationCodes.expiresAt, new Date()),
    )).orderBy(desc(verificationCodes.createdAt)).limit(1);

    if (!row) throw new BadRequestException('Código expirado o no solicitado');
    if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException('Demasiados intentos. Solicite un código nuevo.');
    }

    const ok = await bcrypt.compare(code, row.codeHash);
    await this.db.update(verificationCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(verificationCodes.id, row.id));

    if (!ok) throw new BadRequestException('Código incorrecto');

    await this.db.delete(verificationCodes).where(eq(verificationCodes.id, row.id));

    const verificationToken = this.jwt.sign(
      { phone, purpose, typ: 'wa_verify' },
      { expiresIn: '15m' },
    );

    return { ok: true, verificationToken, phone };
  }

  verifyToken(token: string, expectedPurpose: 'register' | 'login') {
    try {
      const payload = this.jwt.verify(token) as { phone?: string; purpose?: string; typ?: string };
      if (payload.typ !== 'wa_verify' || payload.purpose !== expectedPurpose || !payload.phone) {
        throw new Error('invalid');
      }
      return normalizePhoneDigits(payload.phone);
    } catch {
      throw new BadRequestException('Verificación expirada. Solicite un código nuevo.');
    }
  }
}
