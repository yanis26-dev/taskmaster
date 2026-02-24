import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_WEBHOOK } from './queue-names';
import { PrismaService } from '../common/prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { AuthService } from '../auth/auth.service';
import { TaskStatus, TaskSource } from '@prisma/client';

export const JOB_PROCESS_MAIL = 'process-mail-notification';
export const JOB_PROCESS_CALENDAR = 'process-calendar-notification';

export interface MailNotificationPayload {
  userId: string;
  messageId: string;
  changeType: 'created' | 'updated' | 'deleted';
}

export interface CalendarNotificationPayload {
  userId: string;
  eventId: string;
  changeType: 'created' | 'updated' | 'deleted';
}

@Processor(QUEUE_WEBHOOK, { concurrency: 3 })
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly authService: AuthService,
  ) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case JOB_PROCESS_MAIL:
        return this.processMail(job.data as MailNotificationPayload);
      case JOB_PROCESS_CALENDAR:
        return this.processCalendar(job.data as CalendarNotificationPayload);
    }
  }

  // ── Email → Task ─────────────────────────────────────────────────────────

  private async processMail({ userId, messageId, changeType }: MailNotificationPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { settings: true } });
    if (!user?.settings?.autoEmailToTask) return;

    if (changeType === 'deleted') {
      // Mark external as missing but keep the task
      await this.prisma.task.updateMany({
        where: { userId, externalId: messageId },
        data: { externalMissing: true },
      });
      return;
    }

    // Fetch message from Graph
    const accessToken = await this.authService.getMicrosoftAccessToken(userId);
    const message = await this.fetchGraphMessage(accessToken, messageId);
    if (!message) return;

    // Idempotency: check if task already exists for this message
    const existing = await this.prisma.task.findFirst({
      where: { userId, externalProvider: 'microsoft_graph', externalId: messageId },
    });

    if (existing) {
      // Update title/link if changed
      await this.prisma.task.update({
        where: { id: existing.id },
        data: { title: `Email: ${message.subject}`, externalMissing: false },
      });
      return;
    }

    // Create new task
    await this.tasksService.create(userId, {
      title: `Email: ${message.subject ?? '(No subject)'}`,
      notes: `**From:** ${message.from?.emailAddress?.address ?? 'unknown'}\n\n${message.bodyPreview ?? ''}`,
      status: 'next' as TaskStatus,
      priority: 'P2',
      source: TaskSource.outlook_email,
    });

    // Attach external ref via raw update (bypassing DTO)
    await this.prisma.task.updateMany({
      where: { userId, source: TaskSource.outlook_email, externalId: null },
      data: {
        externalProvider: 'microsoft_graph',
        externalType: 'mail_message',
        externalId: messageId,
        externalUrl: `https://outlook.office365.com/mail/deeplink/compose/${messageId}`,
      },
    });

    this.logger.log(`Created task from email ${messageId} for user ${userId}`);
  }

  // ── Calendar → Task ──────────────────────────────────────────────────────

  private async processCalendar({ userId, eventId, changeType }: CalendarNotificationPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { settings: true } });
    if (!user?.settings?.autoCalendarToTask) return;

    if (changeType === 'deleted') {
      await this.prisma.task.updateMany({
        where: { userId, externalId: eventId },
        data: { externalMissing: true },
      });
      return;
    }

    const accessToken = await this.authService.getMicrosoftAccessToken(userId);
    const event = await this.fetchGraphEvent(accessToken, eventId);
    if (!event) return;

    // Only process if title starts with "TODO:" or has category "Task"
    const isTask =
      event.subject?.startsWith('TODO:') ||
      (Array.isArray(event.categories) && event.categories.includes('Task'));
    if (!isTask) return;

    const title = event.subject?.replace(/^TODO:\s*/i, '').trim() ?? 'Calendar Task';
    const dueAt = event.end?.dateTime ? new Date(event.end.dateTime) : undefined;

    // Upsert by externalId
    const existing = await this.prisma.task.findFirst({
      where: { userId, externalProvider: 'microsoft_graph', externalId: eventId },
    });

    if (existing) {
      await this.prisma.task.update({
        where: { id: existing.id },
        data: { title, dueAt, externalMissing: false },
      });
    } else {
      await this.prisma.task.create({
        data: {
          userId,
          title,
          dueAt,
          status: TaskStatus.next,
          priority: 'P2',
          source: TaskSource.outlook_calendar,
          externalProvider: 'microsoft_graph',
          externalType: 'calendar_event',
          externalId: eventId,
          externalUrl: event.webLink,
        },
      });
      this.logger.log(`Created task from calendar event ${eventId} for user ${userId}`);
    }
  }

  // ── Graph API helpers ────────────────────────────────────────────────────

  private async fetchGraphMessage(accessToken: string, messageId: string) {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${messageId}?$select=subject,bodyPreview,from,webLink`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return null;
    return res.json() as Promise<any>;
  }

  private async fetchGraphEvent(accessToken: string, eventId: string) {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}?$select=subject,categories,start,end,webLink`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return null;
    return res.json() as Promise<any>;
  }
}
