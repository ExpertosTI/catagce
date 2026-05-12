import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../common/decorators/user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!, // Validated at startup in main.ts — never falls back
    });
  }

  validate(payload: { sub: string; sellerId: string; email: string; role: string }): UserPayload {
    return { 
      userId: payload.sub, 
      sellerId: payload.sellerId, 
      email: payload.email,
      role: payload.role || 'seller'
    };
  }
}
