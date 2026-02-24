import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { ProjectsModule } from './projects/projects.module';
import { OutlookModule } from './outlook/outlook.module';
import { JobsModule } from './jobs/jobs.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),

    // ── Rate limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 300 },
    ]),

    // ── Cron jobs ────────────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Feature modules ──────────────────────────────────────────────────────
    PrismaModule,
    AuthModule,
    TasksModule,
    ProjectsModule,
    OutlookModule,
    JobsModule,
    SettingsModule,
    AdminModule,
  ],
})
export class AppModule {}
