import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { OIDCStrategy, IProfile } from 'passport-azure-ad';
import { AuthService } from './auth.service';

/**
 * Passport strategy for Microsoft Entra ID (Azure AD) OpenID Connect.
 * After successful OAuth, calls AuthService.upsertUser to sync user and tokens.
 */
@Injectable()
export class MicrosoftStrategy extends PassportStrategy(OIDCStrategy, 'microsoft', true) {
  private readonly logger = new Logger(MicrosoftStrategy.name);

  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      identityMetadata: `https://login.microsoftonline.com/${config.get('AZURE_TENANT_ID')}/v2.0/.well-known/openid-configuration`,
      clientID: config.get<string>('AZURE_CLIENT_ID'),
      clientSecret: config.get<string>('AZURE_CLIENT_SECRET'),
      responseType: 'code',
      responseMode: 'query',
      redirectUrl: config.get<string>('AZURE_REDIRECT_URI'),
      allowHttpForRedirectUrl: config.get('NODE_ENV') !== 'production',
      validateIssuer: false,
      passReqToCallback: false,
      scope: ['openid', 'profile', 'email', 'offline_access', 'Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'Calendars.Read', 'Calendars.ReadWrite', 'User.Read'],
      loggingLevel: 'warn',
    });
  }

  async validate(
    _iss: string,
    _sub: string,
    profile: IProfile,
    accessToken: string,
    refreshToken: string,
  ): Promise<any> {
    try {
      return await this.authService.upsertMicrosoftUser(profile, accessToken, refreshToken);
    } catch (err) {
      this.logger.error('Microsoft strategy error', err);
      throw err;
    }
  }
}
