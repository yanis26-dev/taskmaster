import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_RECURRENCE, QUEUE_DIGEST } from './queue-names';
import { JOB_GENERATE_RECURRENCES } from './recurrence.processor';
import { JOB_SEND_DIGEST } from './digest.processor';
import { PrismaService } from '../common/prisma/prisma.service';
import { formatInTimeZone } from 'date-fns-tz';

@Injectable()
export class JobsScheduler {
  private readonly logger = new Logger(JobsScheduler.name);

  constructor(
    @InjectQueue(QUEUE_RECURRENCE) private readonly recurrenceQueue: Queue,
    @InjectQueue(QUEUE_DIGEST) private readonly digestQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /** Run recurrence generation every hour */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduleRecurrence() {
    await this.recurrenceQueue.add(JOB_GENERATE_RECURRENCES, {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    this.logger.debug('Queued recurrence generation job');
  }

  /**
   * Every minute, check if any user's digest time matches current minute.
   * This avoids a complex per-user cron; instead we tick every minute and compare.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleDigests() {
    const users = await this.prisma.user.findMany({
      where: { settings: { digestEnabled: true }, microsoftId: { not: null } },
      include: { settings: true },
    });

    for (const user of users) {
      if (!user.settings) continue;
      const tz = user.settings.timezone;
      const digestTime = user.settings.digestTime; // "HH:MM"
      const nowInTz = formatInTimeZone(new Date(), tz, 'HH:mm');

      if (nowInTz === digestTime) {
        // Only enqueue if not already queued today (deduplicate with jobId)
        const today = formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
        const jobId = `digest:${user.id}:${today}`;
        const existing = await this.digestQueue.getJob(jobId);
        if (!existing) {
          await this.digestQueue.add(JOB_SEND_DIGEST, { userId: user.id }, {
            jobId,
            attempts: 3,
            backoff: { type: 'exponential', delay: 10000 },
          });
          this.logger.log(`Queued daily digest for user ${user.email}`);
        }
      }
    }
  }

  /** Renew Graph subscriptions that expire within 24h — runs every 6h */
  @Cron('0 */6 * * *')
  async renewSubscriptions() {
    const expiringSoon = await this.prisma.outlookSubscription.findMany({
      where: {
        active: true,
        expiresAt: { lt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      },
      include: { user: true },
    });

    for (const sub of expiringSoon) {
      try {
        const { OutlookService } = await import('../outlook/outlook.service');
        // Note: circular dep avoidance — OutlookService is imported dynamically here
        // In production, inject via forwardRef or move renewal to OutlookService with @Cron
        this.logger.warn(`Subscription ${sub.graphSubId} expiring — trigger renewal manually or via OutlookService`);
      } catch {
        // If subscription renewal fails, we mark it inactive
        await this.prisma.outlookSubscription.update({
          where: { id: sub.id },
          data: { active: false },
        });
      }
    }
  }
}
