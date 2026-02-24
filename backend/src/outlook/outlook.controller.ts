import {
  Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsDateString, IsInt, IsUUID, Min } from 'class-validator';
import { OutlookService } from './outlook.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

class CreateFocusBlockDto {
  @IsUUID() taskId!: string;
  @IsDateString() startTime!: string;
  @IsInt() @Min(15) durationMinutes!: number;
}

@ApiTags('outlook')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('outlook')
export class OutlookController {
  constructor(private readonly svc: OutlookService) {}

  @Get('subscriptions')
  @ApiOperation({ summary: 'List active Graph subscriptions' })
  getSubscriptions(@CurrentUser() u: JwtPayload) {
    return this.svc.getSubscriptions(u.sub);
  }

  @Post('subscriptions/mail')
  @ApiOperation({ summary: 'Subscribe to flagged mail notifications' })
  createMailSub(@CurrentUser() u: JwtPayload) {
    return this.svc.createMailSubscription(u.sub);
  }

  @Post('subscriptions/calendar')
  @ApiOperation({ summary: 'Subscribe to calendar event notifications' })
  createCalendarSub(@CurrentUser() u: JwtPayload) {
    return this.svc.createCalendarSubscription(u.sub);
  }

  @Post('subscriptions/:id/renew')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renew a subscription' })
  renewSub(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.svc.renewSubscription(u.sub, id);
  }

  @Delete('subscriptions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subscription' })
  deleteSub(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.svc.deleteSubscription(u.sub, id);
  }

  @Post('focus-block')
  @ApiOperation({ summary: 'Create a calendar focus block for a task' })
  createFocusBlock(@CurrentUser() u: JwtPayload, @Body() dto: CreateFocusBlockDto) {
    return this.svc.createFocusBlock(u.sub, dto.taskId, new Date(dto.startTime), dto.durationMinutes);
  }
}
