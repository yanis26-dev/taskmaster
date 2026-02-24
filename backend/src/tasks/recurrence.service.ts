import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RRule } from 'rrule';
import { TaskStatus, ActivityAction } from '@prisma/client';

/**
 * Handles recurring task generation.
 * When a recurring task is marked done, spawns the next instance.
 */
@Injectable()
export class RecurrenceService {
  private readonly logger = new Logger(RecurrenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scan all recurring tasks that have been completed and need a next instance.
   * Called by the hourly cron job.
   */
  async generatePendingRecurrences(): Promise<number> {
    // Find completed tasks with recurrenceRule that don't have a recent child
    const parents = await this.prisma.task.findMany({
      where: {
        recurrenceRule: { not: null },
        status: TaskStatus.done,
        recurrenceParentId: null, // Is itself a parent (not a child)
      },
    });

    let spawned = 0;
    for (const parent of parents) {
      try {
        const didSpawn = await this.spawnNext(parent);
        if (didSpawn) spawned++;
      } catch (err) {
        this.logger.error(`Recurrence error for task ${parent.id}`, err);
      }
    }
    return spawned;
  }

  /**
   * Spawn the next occurrence of a recurring task.
   * Called immediately when a task with recurrenceRule is marked done.
   */
  async spawnNext(parentTask: { id: string; userId: string; recurrenceRule: string | null; dueAt: Date | null; title: string; notes: string | null; priority: string; projectId: string | null; tags: string[]; estimateMinutes: number | null; lastRecurrenceAt: Date | null }): Promise<boolean> {
    if (!parentTask.recurrenceRule) return false;

    const nextDue = this.computeNextOccurrence(
      parentTask.recurrenceRule,
      parentTask.dueAt ?? parentTask.lastRecurrenceAt ?? new Date(),
    );

    if (!nextDue) {
      this.logger.debug(`No more occurrences for task ${parentTask.id}`);
      return false;
    }

    // Idempotency: check if a child for this date already exists
    const existingChild = await this.prisma.task.findFirst({
      where: {
        recurrenceParentId: parentTask.id,
        dueAt: nextDue,
      },
    });
    if (existingChild) return false;

    const child = await this.prisma.task.create({
      data: {
        userId: parentTask.userId,
        title: parentTask.title,
        notes: parentTask.notes,
        status: TaskStatus.next,
        priority: parentTask.priority as any,
        dueAt: nextDue,
        projectId: parentTask.projectId,
        tags: parentTask.tags,
        estimateMinutes: parentTask.estimateMinutes,
        recurrenceRule: parentTask.recurrenceRule,
        recurrenceParentId: parentTask.id,
        source: 'manual',
      },
    });

    // Update parent's lastRecurrenceAt
    await this.prisma.task.update({
      where: { id: parentTask.id },
      data: { lastRecurrenceAt: nextDue },
    });

    await this.prisma.activityLog.create({
      data: {
        taskId: parentTask.id,
        userId: parentTask.userId,
        action: ActivityAction.recurring_spawned,
        payload: { childTaskId: child.id, nextDue: nextDue.toISOString() },
      },
    });

    this.logger.log(`Spawned recurring child ${child.id} from parent ${parentTask.id} due ${nextDue.toISOString()}`);
    return true;
  }

  /**
   * Parse RRULE string and compute the next occurrence after `after` date.
   */
  computeNextOccurrence(rruleString: string, after: Date): Date | null {
    try {
      // Normalize: strip "RRULE:" prefix if present
      const ruleStr = rruleString.replace(/^RRULE:/i, '');
      const rule = RRule.fromString(ruleStr);
      const next = rule.after(after, false);
      return next;
    } catch (err) {
      this.logger.error(`Invalid RRULE: ${rruleString}`, err);
      return null;
    }
  }
}
