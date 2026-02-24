import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { IsBoolean, IsString, IsOptional, Matches } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsBoolean() digestEnabled?: boolean;
  @IsOptional() @IsString() @Matches(/^\d{2}:\d{2}$/) digestTime?: string;
  @IsOptional() @IsBoolean() autoEmailToTask?: boolean;
  @IsOptional() @IsBoolean() autoCalendarToTask?: boolean;
  @IsOptional() @IsBoolean() autoTaskToCalendar?: boolean;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async update(userId: string, dto: UpdateSettingsDto) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }
}
