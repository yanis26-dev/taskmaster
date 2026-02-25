import {
  Controller, Get, Post, Delete, Patch, Param, Body, UseGuards,
  HttpCode, HttpStatus, BadRequestException, Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString } from 'class-validator';
import { AdminGuard } from './admin.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

class InviteDto {
  @IsEmail()
  email!: string;
}

class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsEnum(Role)
  role!: Role;
}

class ChangeRoleDto {
  @IsEnum(Role)
  role!: Role;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  // ── Users ────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
        microsoftId: true, _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change user role' })
  async changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() me: JwtPayload,
  ) {
    if (id === me.sub) throw new BadRequestException('Cannot change your own role');
    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: { id: true, email: true, role: true },
    });
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user' })
  async deleteUser(@Param('id') id: string, @CurrentUser() me: JwtPayload) {
    if (id === me.sub) throw new BadRequestException('Cannot delete yourself');
    await this.prisma.user.delete({ where: { id } });
  }

  @Post('users')
  @ApiOperation({ summary: 'Manually create a user account (no Microsoft account created)' })
  async createUser(@Body() dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('A user with this email already exists');

    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        settings: {
          create: {
            timezone: process.env.DEFAULT_TIMEZONE ?? 'UTC',
            digestEnabled: true,
            digestTime: process.env.DEFAULT_DIGEST_TIME ?? '07:30',
          },
        },
      },
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
        microsoftId: true, _count: { select: { tasks: true } },
      },
    });
  }

  // ── Invitations ──────────────────────────────────────────────────────────

  @Get('invitations')
  @ApiOperation({ summary: 'List pending invitations' })
  async listInvitations() {
    return this.prisma.invitation.findMany({
      where: { accepted: false, expiresAt: { gt: new Date() } },
      include: { invitedBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('invitations')
  @ApiOperation({ summary: 'Invite a user by email' })
  async invite(@Body() dto: InviteDto, @CurrentUser() me: JwtPayload) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('User already exists with this email');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.invitation.upsert({
      where: { email: dto.email },
      update: { expiresAt, accepted: false, invitedById: me.sub },
      create: { email: dto.email, invitedById: me.sub, expiresAt },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/invite?token=${invitation.token}`;

    // Send invite email via Microsoft Graph (best-effort — don't fail if email fails)
    try {
      const accessToken = await this.authService.getMicrosoftAccessToken(me.sub);
      const admin = await this.prisma.user.findUniqueOrThrow({ where: { id: me.sub }, select: { name: true } });
      await this.sendInviteEmail(accessToken, dto.email, admin.name, inviteLink);
    } catch (err) {
      this.logger.warn(`Could not send invite email to ${dto.email}: ${(err as Error).message}`);
    }

    return { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt, inviteLink };
  }

  private async sendInviteEmail(accessToken: string, toEmail: string, adminName: string, inviteLink: string) {
    const body = {
      message: {
        subject: `${adminName} invited you to TaskMaster`,
        body: {
          contentType: 'HTML',
          content: `
            <p>Hi,</p>
            <p><strong>${adminName}</strong> has invited you to join <strong>TaskMaster</strong> — a personal task management system.</p>
            <p><a href="${inviteLink}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0">Accept Invitation</a></p>
            <p style="color:#6b7280;font-size:13px">This link expires in 7 days. Sign in with your Microsoft account after clicking.</p>
          `,
        },
        toRecipients: [{ emailAddress: { address: toEmail } }],
      },
      saveToSentItems: false,
    };

    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Graph sendMail failed: ${err}`);
    }
  }

  @Post('invitations/link')
  @ApiOperation({ summary: 'Generate an invite link without sending an email' })
  async createInviteLink(@Body() dto: InviteDto, @CurrentUser() me: JwtPayload) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('User already exists with this email');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.upsert({
      where: { email: dto.email },
      update: { expiresAt, accepted: false, invitedById: me.sub },
      create: { email: dto.email, invitedById: me.sub, expiresAt },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/invite?token=${invitation.token}`;

    return { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt, inviteLink };
  }

  @Delete('invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an invitation' })
  async revokeInvitation(@Param('id') id: string) {
    await this.prisma.invitation.delete({ where: { id } });
  }
}
