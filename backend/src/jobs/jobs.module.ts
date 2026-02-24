import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RecurrenceProcessor } from './recurrence.processor';
import { DigestProcessor } from './digest.processor';
import { WebhookProcessor } from './webhook.processor';
import { JobsScheduler } from './jobs.scheduler';
import { TasksModule } from '../tasks/tasks.module';
import { SettingsModule } from '../settings/settings.module';
import { AuthModule } from '../auth/auth.module';
import { QUEUE_RECURRENCE, QUEUE_DIGEST, QUEUE_WEBHOOK } from './queue-names';

export { QUEUE_RECURRENCE, QUEUE_DIGEST, QUEUE_WEBHOOK };

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          const url = new URL(redisUrl);
          return {
            connection: {
              host: url.hostname,
              port: Number(url.port) || 6379,
              password: url.password || undefined,
              tls: url.protocol === 'rediss:' ? {} : undefined,
            },
          };
        }
        return {
          connection: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_RECURRENCE },
      { name: QUEUE_DIGEST },
      { name: QUEUE_WEBHOOK },
    ),
    TasksModule,
    SettingsModule,
    AuthModule,
  ],
  providers: [RecurrenceProcessor, DigestProcessor, WebhookProcessor, JobsScheduler],
  exports: [BullModule],
})
export class JobsModule {}
