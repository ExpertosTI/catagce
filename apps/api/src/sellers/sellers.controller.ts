import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { SellersService } from './sellers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, UserPayload } from '../common/decorators/user.decorator';
import { UpdateBrandingDto } from './dto/sellers.dto';

@Controller('sellers')
@UseGuards(JwtAuthGuard)
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get()
  findAll(@CurrentUser() user: UserPayload) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can list all sellers');
    }
    return this.sellersService.findAll();
  }

  @Get('profile')
  getProfile(@CurrentUser() user: UserPayload) {
    return this.sellersService.getProfile(user.sellerId);
  }

  @Patch('branding')
  updateBranding(@CurrentUser() user: UserPayload, @Body() dto: UpdateBrandingDto) {
    return this.sellersService.updateBranding(user.sellerId, dto);
  }
}
