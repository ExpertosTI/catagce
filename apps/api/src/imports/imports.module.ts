import { Module, forwardRef } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { MobileModule } from '../mobile/mobile.module';

@Module({
  imports: [forwardRef(() => MobileModule)],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
