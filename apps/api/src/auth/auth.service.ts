import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from '../database/database.module';
import { sellers, sellerBranding } from '@catagce/db';
import { eq, or } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

const BCRYPT_COST = 10;
const BCRYPT_PREFIX = /^\$2[aby]\$/;

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 2 && s.length <= 60;
}

export interface LoginResponse {
  token: string;
  seller: { id: string; name: string; slug: string; role: string };
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.bootstrapAdmin();
  }

  /**
   * One-time admin bootstrap from env. Idempotent: if an admin with the same
   * email exists, nothing is created. Use BOOTSTRAP_ADMIN_EMAIL/PASSWORD on
   * fresh deploys; once the admin exists you can remove the env vars.
   */
  private async bootstrapAdmin(): Promise<void> {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
    if (!email || !password) return;
    if (!isValidEmail(email) || password.length < 8) {
      this.logger.warn('BOOTSTRAP_ADMIN_* are set but invalid; skipping.');
      return;
    }
    try {
      const [existing] = await this.db
        .select()
        .from(sellers)
        .where(eq(sellers.email, email))
        .limit(1);
      if (existing) return;

      const hashed = await bcrypt.hash(password, BCRYPT_COST);
      const slug = toSlug(process.env.BOOTSTRAP_ADMIN_SLUG || email.split('@')[0]);
      const [seller] = await this.db
        .insert(sellers)
        .values({
          name: process.env.BOOTSTRAP_ADMIN_NAME || 'Catagce Admin',
          slug: isValidSlug(slug) ? slug : `admin-${Date.now()}`,
          email,
          password: hashed,
          role: 'admin',
        })
        .returning();

      await this.db.insert(sellerBranding).values({
        sellerId: seller.id,
        primaryColor: '#FACD01',
        accentColor: '#000000',
      });
      this.logger.log(`Bootstrap admin created: ${email}`);
    } catch (err: any) {
      this.logger.warn(`Bootstrap admin failed: ${err.message}`);
    }
  }

  async register(dto: { name: string; email: string; password: string; slug?: string }): Promise<LoginResponse> {
    const name = (dto?.name || '').toString().trim();
    const email = (dto?.email || '').toString().trim().toLowerCase();
    const password = (dto?.password || '').toString();
    const slug = toSlug((dto?.slug || name).toString());

    if (name.length < 2) throw new BadRequestException('Nombre requerido (mín. 2)');
    if (!isValidEmail(email)) throw new BadRequestException('Email inválido');
    if (password.length < 8) throw new BadRequestException('Contraseña mínima 8 caracteres');
    if (!isValidSlug(slug)) throw new BadRequestException('Identificador inválido');

    const [conflict] = await this.db
      .select()
      .from(sellers)
      .where(or(eq(sellers.email, email), eq(sellers.slug, slug)))
      .limit(1);
    if (conflict) {
      throw new ConflictException('El email o el identificador ya están en uso');
    }

    const hashed = await bcrypt.hash(password, BCRYPT_COST);

    const [seller] = await this.db
      .insert(sellers)
      .values({ name, email, password: hashed, slug })
      .returning();

    try {
      await this.db
        .insert(sellerBranding)
        .values({
          sellerId: seller.id,
          primaryColor: '#FACD01',
          accentColor: '#000000',
        });
    } catch (e: any) {
      this.logger.warn(`Default branding not seeded for ${seller.id}: ${e.message}`);
    }

    return this.issueToken(seller);
  }

  async loginWithEmail(emailRaw: string, password: string): Promise<LoginResponse> {
    const email = (emailRaw || '').trim().toLowerCase();
    if (!email || !password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const [seller] = await this.db
      .select()
      .from(sellers)
      .where(eq(sellers.email, email))
      .limit(1);

    if (!seller || !seller.password) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (seller.status && seller.status !== 'active') {
      throw new UnauthorizedException('Cuenta inactiva');
    }

    let valid = false;
    if (BCRYPT_PREFIX.test(seller.password)) {
      valid = await bcrypt.compare(password, seller.password);
    } else {
      // Legacy plaintext password — accept once, then upgrade to bcrypt.
      if (seller.password === password) {
        valid = true;
        try {
          const upgraded = await bcrypt.hash(password, BCRYPT_COST);
          await this.db
            .update(sellers)
            .set({ password: upgraded, updatedAt: new Date() })
            .where(eq(sellers.id, seller.id));
        } catch {
          /* non-blocking */
        }
      }
    }

    if (!valid) throw new UnauthorizedException('Credenciales inválidas');
    return this.issueToken(seller);
  }

  private issueToken(seller: any): LoginResponse {
    const role = seller.role || 'seller';
    const payload = {
      sub: seller.id,
      sellerId: seller.id,
      email: seller.email,
      role,
    };
    return {
      token: this.jwtService.sign(payload),
      seller: { id: seller.id, name: seller.name, slug: seller.slug, role },
    };
  }
}
