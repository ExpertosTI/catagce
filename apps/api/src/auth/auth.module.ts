import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { VerificationService } from './verification.service';
import { AuditService } from '../common/services/audit.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PlansModule } from '../plans/plans.module';
import { requireJwtSecret } from '../common/security/security.util';

@Module({
  imports: [
    WhatsAppModule,
    forwardRef(() => PlansModule),
    JwtModule.register({
      global: true,
      secret: requireJwtSecret(),
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, VerificationService, AuditService],
  exports: [AuthService],
})
export class AuthModule {}
