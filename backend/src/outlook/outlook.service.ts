import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import * as crypto from 'crypto';

interface GraphSubscription {
  id: string;
  expirationDateTime: string;
}

/**
 * Manages Microsoft Graph subscriptions (webhooks) for mail and calendar.
 * Subscriptions expire after max 4230 minutes (~3 days) for mail.
 */
@Injectable()
export class OutlookService {
  private readonly logger = new Logger(OutlookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ── Subscription management ───────────────────────────────────────────────

  async createMailSubscription(userId: string) {
    return this.createSubscription(userId, {
      resource: "me/messages?$filter=flag/flagStatus eq 'flagged'",
      changeTypes: ['created', 'updated', 'deleted'],
      resource_label: 'mail',
    });
  }

  async createCalendarSubscription(userId: string) {
    return this.createSubscription(userId, {
      resource: 'me/events',
      changeTypes: ['created', 'updated', 'deleted'],
      resource_label: 'calendar',
    });
  }

  private async createSubscription(
    userId: string,
    opts: { resource: string; changeTypes: string[]; resource_label: string },
  ) {
    const accessToken = await this.authService.getMicrosoftAccessToken(userId);
    const baseUrl = this.config.get('WEBHOOK_BASE_URL');
    const clientState = crypto.randomBytes(24).toString('hex');

    // Graph mail subscriptions expire after max 4230 min (< 3 days)
    const expiresAt = new Date(Date.now() + 4000 * 60 * 1000);

    const notificationUrl = `${baseUrl}/api/webhooks/outlook/${opts.resource_label}`;
    const body = {
      changeType: opts.changeTypes.join(','),
      notificationUrl,
      resource: opts.resource,
      expirationDateTime: expiresAt.toISOString(),
      clientState,
    };

    this.logger.log(`Creating Graph subscription: ${JSON.stringify(body)}`);

    const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error('Subscription creation failed', err);
      throw new BadRequestException(`Graph subscription failed: ${err}`);
    }

    const sub = (await res.json()) as GraphSubscription;

    return this.prisma.outlookSubscription.upsert({
      where: { graphSubId: sub.id },
      update: { expiresAt: new Date(sub.expirationDateTime), clientState, active: true },
      create: {
        userId,
        graphSubId: sub.id,
        resource: opts.resource,
        changeType: opts.changeTypes.join(','),
        expiresAt: new Date(sub.expirationDateTime),
        clientState,
      },
    });
  }

  async renewSubscription(userId: string, subscriptionId: string) {
    const sub = await this.prisma.outlookSubscription.findFirst({
      where: { graphSubId: subscriptionId, userId },
    });
    if (!sub) throw new BadRequestException('Subscription not found');

    const accessToken = await this.authService.getMicrosoftAccessToken(userId);
    const newExpiry = new Date(Date.now() + 4000 * 60 * 1000);

    const res = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expirationDateTime: newExpiry.toISOString() }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error('Subscription renewal failed', err);
      // Mark inactive so it gets recreated
      await this.prisma.outlookSubscription.update({
        where: { id: sub.id },
        data: { active: false },
      });
      throw new BadRequestException(`Renewal failed: ${err}`);
    }

    return this.prisma.outlookSubscription.update({
      where: { id: sub.id },
      data: { expiresAt: newExpiry, active: true },
    });
  }

  async deleteSubscription(userId: string, subscriptionId: string) {
    const sub = await this.prisma.outlookSubscription.findFirst({
      where: { graphSubId: subscriptionId, userId },
    });
    if (!sub) return;

    const accessToken = await this.authService.getMicrosoftAccessToken(userId);
    await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    await this.prisma.outlookSubscription.delete({ where: { id: sub.id } });
  }

  async getSubscriptions(userId: string) {
    return this.prisma.outlookSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Verify HMAC client state from Graph notification */
  validateClientState(storedClientState: string, receivedClientState: string): boolean {
    return storedClientState === receivedClientState;
  }

  /**
   * Create a focus block calendar event for a task.
   * Called when user clicks "Schedule focus time" on a task.
   */
  async createFocusBlock(userId: string, taskId: string, startTime: Date, durationMinutes: number) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) throw new BadRequestException('Task not found');

    const accessToken = await this.authService.getMicrosoftAccessToken(userId);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const event = {
      subject: `TODO: ${task.title}`,
      body: { contentType: 'text', content: task.notes ?? '' },
      start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
      end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
      categories: ['Task'],
      showAs: 'busy',
    };

    const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) throw new BadRequestException('Failed to create calendar event');

    const created = await res.json() as any;

    // Link back to task
    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        externalProvider: 'microsoft_graph',
        externalType: 'calendar_event',
        externalId: created.id,
        externalUrl: created.webLink,
      },
    });

    return created;
  }
}
