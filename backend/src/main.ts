import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const session = require('express-session');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const port = configService.get<number>('PORT', 3001);

  // ── Security middleware ─────────────────────────────────────────────────────
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());

  // ── Session (required by passport-azure-ad OIDC for state management) ───────
  app.use(session({
    secret: configService.get<string>('JWT_SECRET', 'changeme'),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 5 * 60 * 1000 }, // 5 min — only used during OAuth handshake
  }));

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global prefix & validation ───────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger (dev only) ───────────────────────────────────────────────────────
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TaskMaster API')
      .setDescription('Personal task management REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    Logger.log('Swagger docs: http://localhost:' + port + '/api/docs', 'Bootstrap');
  }

  await app.listen(port);
  Logger.log(`TaskMaster API running on port ${port}`, 'Bootstrap');
}

bootstrap();
