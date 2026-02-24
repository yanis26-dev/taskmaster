import {
  Controller, Get, Post, Req, Res, UseGuards, HttpCode, HttpStatus, Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { IsString } from 'class-validator';

class RefreshDto {
  @IsString()
  refreshToken!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Redirect to Microsoft login */
  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Redirect to Microsoft OAuth' })
  microsoftLogin() {
    // Guard handles redirect
  }

  /** Microsoft OAuth callback */
  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Microsoft OAuth callback' })
  async microsoftCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string };
    const { accessToken, refreshToken } = await this.authService.login(user.id);

    // Set HTTP-only cookies (SameSite=Strict for CSRF protection)
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 min
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?success=true`);
  }

  /** Refresh access token using refresh token from cookie or body */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token' })
  async refresh(@Req() req: Request, @Res() res: Response, @Body() body: RefreshDto) {
    const rawRefresh = req.cookies?.['refresh_token'] ?? body.refreshToken;
    const { accessToken, refreshToken } = await this.authService.refresh(rawRefresh);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true, secure: isProd, sameSite: 'strict', maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true, secure: isProd, sameSite: 'strict',
      path: '/api/auth/refresh', maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ ok: true, accessToken });
  }

  /** Get current user profile */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user' })
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  /** Logout – revoke all refresh tokens */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout' })
  async logout(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    await this.authService.logout(user.sub);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
    return res.json({ ok: true });
  }
}
