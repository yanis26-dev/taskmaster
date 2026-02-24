import {
  Controller, Post, Get, Query, Res, HttpCode, HttpStatus, Logger, Body,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Request, Response } from 'express';
import { PrismaService } from '../common/prisma/prisma.service';
import { OutlookService } from './outlook.service';
import { QUEUE_WEBHOOK } from '../jobs/queue-names';
import { JOB_PROCESS_MAIL, JOB_PROCESS_CALENDAR } from '../jobs/webhook.processor';

interface GraphNotification {
  value: Array<{
    subscriptionId: string;
    changeType: string;
    clientState: string;
    resource: string;
    resourceData?: { id?: string; '@odata.id'?: string };
  }>;
}

/**
 * Receives Microsoft Graph change notifications (webhooks).
 * Validation flow:
 *   1. On subscription creation, Graph sends GET with ?validationToken → echo it back.
 *   2. On change, Graph sends POST with JSON payload; verify clientState before processing.
 */
@ApiTags('webhooks')
@Controller('webhooks/outlook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    @InjectQueue(QUEUE_WEBHOOK) private readonly webhookQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly outlookService: OutlookService,
  ) {}

  // ── Mail webhook ──────────────────────────────────────────────────────────

  @Get('mail')
  @HttpCode(HttpStatus.OK)
  async validateMailWebhook(@Query('validationToken') token: string, @Res() res: Response) {
    if (token) {
      // Must echo back the validation token as plain text within 10s
      return res.set('Content-Type', 'text/plain').send(token);
    }
    return res.sendStatus(HttpStatus.BAD_REQUEST);
  }

  @Post('mail')
  async receiveMailNotification(
    @Query('validationToken') validationToken: string,
    @Body() body: GraphNotification,
    @Res() res: Response,
  ) {
    // Graph subscription validation: echo token back as plain text with 200
    if (validationToken) {
      return res.status(200).set('Content-Type', 'text/plain').send(validationToken);
    }

    // Acknowledge immediately — Graph retries if we don't respond within 30s
    res.sendStatus(HttpStatus.ACCEPTED);

    for (const notification of body.value ?? []) {
      await this.enqueueMailNotification(notification);
    }
  }

  // ── Calendar webhook ──────────────────────────────────────────────────────

  @Get('calendar')
  @HttpCode(HttpStatus.OK)
  async validateCalendarWebhook(@Query('validationToken') token: string, @Res() res: Response) {
    if (token) {
      return res.set('Content-Type', 'text/plain').send(token);
    }
    return res.sendStatus(HttpStatus.BAD_REQUEST);
  }

  @Post('calendar')
  async receiveCalendarNotification(
    @Query('validationToken') validationToken: string,
    @Body() body: GraphNotification,
    @Res() res: Response,
  ) {
    if (validationToken) {
      return res.status(200).set('Content-Type', 'text/plain').send(validationToken);
    }

    res.sendStatus(HttpStatus.ACCEPTED);

    for (const notification of body.value ?? []) {
      await this.enqueueCalendarNotification(notification);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async enqueueMailNotification(notification: GraphNotification['value'][0]) {
    // Find the subscription to identify the user
    const sub = await this.prisma.outlookSubscription.findFirst({
      where: { graphSubId: notification.subscriptionId },
    });
    if (!sub) {
      this.logger.warn(`Unknown subscription ${notification.subscriptionId}`);
      return;
    }

    // Validate client state (HMAC-like check)
    if (!this.outlookService.validateClientState(sub.clientState, notification.clientState)) {
      this.logger.warn(`Client state mismatch for subscription ${notification.subscriptionId}`);
      return;
    }

    const messageId = notification.resourceData?.id ?? this.extractIdFromResource(notification.resource);
    if (!messageId) return;

    await this.webhookQueue.add(
      JOB_PROCESS_MAIL,
      { userId: sub.userId, messageId, changeType: notification.changeType },
      {
        jobId: `mail:${messageId}:${notification.changeType}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
  }

  private async enqueueCalendarNotification(notification: GraphNotification['value'][0]) {
    const sub = await this.prisma.outlookSubscription.findFirst({
      where: { graphSubId: notification.subscriptionId },
    });
    if (!sub) return;

    if (!this.outlookService.validateClientState(sub.clientState, notification.clientState)) {
      this.logger.warn(`Client state mismatch for subscription ${notification.subscriptionId}`);
      return;
    }

    const eventId = notification.resourceData?.id ?? this.extractIdFromResource(notification.resource);
    if (!eventId) return;

    await this.webhookQueue.add(
      JOB_PROCESS_CALENDAR,
      { userId: sub.userId, eventId, changeType: notification.changeType },
      {
        jobId: `calendar:${eventId}:${notification.changeType}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
  }

  private extractIdFromResource(resource: string): string | null {
    // resource: "Users/{userId}/Messages/{messageId}"
    const parts = resource.split('/');
    return parts[parts.length - 1] ?? null;
  }
}
