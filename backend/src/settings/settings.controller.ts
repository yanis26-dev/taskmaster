import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService, UpdateSettingsDto } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  @Get()
  get(@CurrentUser() u: JwtPayload) { return this.svc.get(u.sub); }

  @Patch()
  update(@CurrentUser() u: JwtPayload, @Body() dto: UpdateSettingsDto) {
    return this.svc.update(u.sub, dto);
  }
}
