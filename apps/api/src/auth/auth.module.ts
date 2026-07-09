import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { VerificationService } from './verification.service';
import { AuditService } from '../common/services/audit.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    WhatsAppModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'catagce-dev-secret-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, VerificationService, AuditService],
  exports: [AuthService],
})
export class AuthModule {}
