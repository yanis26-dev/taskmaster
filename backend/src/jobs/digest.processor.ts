import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_DIGEST } from './queue-names';
import { PrismaService } from '../common/prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { AuthService } from '../auth/auth.service';
import { format } from 'date-fns';

export const JOB_SEND_DIGEST = 'send-digest';

@Processor(QUEUE_DIGEST)
export class DigestProcessor extends WorkerHost {
  private readonly logger = new Logger(DigestProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly authService: AuthService,
  ) {
    super();
  }

  async process(job: Job<{ userId: string }>) {
    if (job.name !== JOB_SEND_DIGEST) return;

    const { userId } = job.data;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });
    if (!user || !user.settings?.digestEnabled) return;

    const { overdue, today, top3 } = await this.tasksService.findForDigest(userId);

    const dateStr = format(new Date(), 'EEEE, MMMM d, yyyy');
    const subject = `📋 Daily Task Digest – ${dateStr}`;
    const body = this.buildDigestHtml(user.name, dateStr, overdue, today, top3);

    try {
      const accessToken = await this.authService.getMicrosoftAccessToken(userId);
      await this.sendEmail(accessToken, user.email, subject, body);
      this.logger.log(`Daily digest sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Failed to send digest to user ${userId}`, err);
      throw err; // BullMQ will retry
    }
  }

  private async sendEmail(accessToken: string, to: string, subject: string, html: string) {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: false,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Graph sendMail failed: ${err}`);
    }
  }

  private buildDigestHtml(name: string, date: string, overdue: any[], today: any[], top3: any[]): string {
    const taskRow = (t: any) =>
      `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">
          <span style="font-weight:600;color:${this.priorityColor(t.priority)}">[${t.priority}]</span>
          ${t.title}
        </td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">
          ${t.dueAt ? format(new Date(t.dueAt), 'MMM d') : ''}
        </td>
      </tr>`;

    const section = (title: string, tasks: any[]) =>
      tasks.length === 0 ? '' : `
        <h3 style="color:#111827;margin:24px 0 8px">${title} (${tasks.length})</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px">
          ${tasks.map(taskRow).join('')}
        </table>`;

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">
  <h2 style="color:#4f46e5">Good morning, ${name}! 👋</h2>
  <p style="color:#6b7280">${date}</p>

  ${section('🔴 Overdue', overdue)}
  ${section('📅 Due Today', today)}
  ${section('⭐ Top Priorities', top3)}

  ${(overdue.length + today.length + top3.length === 0)
    ? '<p style="color:#6b7280;text-align:center;padding:32px">🎉 All clear! No urgent tasks today.</p>'
    : ''}

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
  <p style="color:#9ca3af;font-size:12px;text-align:center">
    Sent by TaskMaster · <a href="${process.env.FRONTEND_URL}/settings" style="color:#9ca3af">Manage digest settings</a>
  </p>
</body>
</html>`;
  }

  private priorityColor(p: string): string {
    return { P0: '#dc2626', P1: '#ea580c', P2: '#2563eb', P3: '#6b7280' }[p] ?? '#6b7280';
  }
}
