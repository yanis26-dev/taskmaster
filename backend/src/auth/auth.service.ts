import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IProfile } from 'passport-azure-ad';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { CryptoService } from '../common/crypto.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Called after successful Microsoft OAuth. Upserts user + stores encrypted tokens.
   */
  async upsertMicrosoftUser(profile: IProfile, accessToken: string, refreshToken: string) {
    const email = profile._json?.email ?? profile.upn ?? profile._json?.preferred_username;
    const name = profile.displayName ?? profile._json?.name ?? email;
    const microsoftId = profile.oid ?? profile.sub;

    const tokenExpiresAt = new Date(Date.now() + 3600 * 1000);

    // Check if any users exist — first user becomes admin
    const existingUser = await this.prisma.user.findUnique({ where: { microsoftId } });
    const isFirstUser = !existingUser && (await this.prisma.user.count()) === 0;

    // Handle users manually pre-created by an admin (no microsoftId yet, matched by email)
    if (!existingUser && !isFirstUser) {
      const preCreated = await this.prisma.user.findUnique({ where: { email } });
      if (preCreated && !preCreated.microsoftId) {
        // Link their Microsoft account — role was already set by the admin
        return this.prisma.user.update({
          where: { id: preCreated.id },
          data: {
            microsoftId,
            name,
            encryptedAccessToken: this.crypto.encrypt(accessToken),
            encryptedRefreshToken: refreshToken ? this.crypto.encrypt(refreshToken) : undefined,
            tokenExpiresAt,
          },
        });
      }
    }

    // If not first user and not already registered, check for valid invitation
    if (!existingUser && !isFirstUser) {
      const invite = await this.prisma.invitation.findUnique({ where: { email } });
      if (!invite || invite.accepted || invite.expiresAt < new Date()) {
        throw new UnauthorizedException('No invitation found for this email. Contact an admin to request access.');
      }
      // Mark invitation accepted
      await this.prisma.invitation.update({ where: { email }, data: { accepted: true } });
    }

    const user = await this.prisma.user.upsert({
      where: { microsoftId },
      update: {
        email,
        name,
        encryptedAccessToken: this.crypto.encrypt(accessToken),
        encryptedRefreshToken: refreshToken ? this.crypto.encrypt(refreshToken) : undefined,
        tokenExpiresAt,
      },
      create: {
        email,
        name,
        microsoftId,
        role: isFirstUser ? 'admin' : 'user',
        encryptedAccessToken: this.crypto.encrypt(accessToken),
        encryptedRefreshToken: refreshToken ? this.crypto.encrypt(refreshToken) : undefined,
        tokenExpiresAt,
        settings: {
          create: {
            timezone: 'Asia/Jerusalem',
            digestEnabled: true,
            digestTime: this.config.get('DEFAULT_DIGEST_TIME', '07:30'),
          },
        },
      },
    });

    return user;
  }

  /** Issue a short-lived access JWT + rotate refresh token */
  async login(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const payload: JwtPayload = { sub: user.id, email: user.email, name: user.name };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
    });

    // Generate an opaque refresh token stored as a hash
    const rawRefresh = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days

    await this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });

    return { accessToken, refreshToken: rawRefresh };
  }

  /** Verify & rotate refresh token */
  async refresh(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token (rotation)
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    return this.login(stored.userId);
  }

  /** Revoke all refresh tokens for user (logout) */
  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  /** Get decrypted MS access token, refreshing if needed */
  async getMicrosoftAccessToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.encryptedAccessToken) {
      throw new UnauthorizedException('Microsoft account not connected');
    }

    // If token is still valid (5-min buffer), return it
    if (user.tokenExpiresAt && user.tokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return this.crypto.decrypt(user.encryptedAccessToken);
    }

    // Refresh via OAuth token endpoint
    if (!user.encryptedRefreshToken) {
      throw new UnauthorizedException('No refresh token available – please reconnect Microsoft account');
    }

    const refreshToken = this.crypto.decrypt(user.encryptedRefreshToken);
    const newTokens = await this.refreshMicrosoftToken(refreshToken);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        encryptedAccessToken: this.crypto.encrypt(newTokens.access_token),
        encryptedRefreshToken: newTokens.refresh_token
          ? this.crypto.encrypt(newTokens.refresh_token)
          : user.encryptedRefreshToken,
        tokenExpiresAt: new Date(Date.now() + (newTokens.expires_in ?? 3600) * 1000),
      },
    });

    return newTokens.access_token;
  }

  private async refreshMicrosoftToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    const params = new URLSearchParams({
      client_id: this.config.get('AZURE_CLIENT_ID')!,
      client_secret: this.config.get('AZURE_CLIENT_SECRET')!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: 'openid profile email offline_access Mail.Read Mail.ReadWrite Mail.Send Calendars.Read Calendars.ReadWrite User.Read',
    });

    const tenantId = this.config.get('AZURE_TENANT_ID');
    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error('Failed to refresh Microsoft token', err);
      throw new UnauthorizedException('Microsoft token refresh failed');
    }

    return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in?: number }>;
  }

  async getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatarUrl: true, microsoftId: true, role: true, createdAt: true },
    });
  }
}
