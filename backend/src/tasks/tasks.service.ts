import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { TaskStatus, Prisma, ActivityAction } from '@prisma/client';
import { startOfDay, endOfDay, addDays } from 'date-fns';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Create ───────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        userId,
        title: dto.title,
        notes: dto.notes,
        status: dto.status ?? TaskStatus.backlog,
        priority: dto.priority ?? 'P2',
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        projectId: dto.projectId,
        tags: dto.tags ?? [],
        estimateMinutes: dto.estimateMinutes,
        recurrenceRule: dto.recurrenceRule,
        source: dto.source ?? 'manual',
      },
      include: { project: { select: { id: true, name: true, color: true } } },
    });

    await this.logActivity(task.id, userId, ActivityAction.created, { title: task.title });
    return task;
  }

  // ── Find all (with filters) ────────────────────────────────────────────────

  async findAll(userId: string, query: QueryTasksDto) {
    const where: Prisma.TaskWhereInput = { userId };

    if (query.status?.length) {
      where.status = { in: query.status };
    } else if (!query.includeCompleted) {
      where.status = { notIn: [TaskStatus.done, TaskStatus.canceled] };
    }

    if (query.priority?.length) where.priority = { in: query.priority };
    if (query.projectId) where.projectId = query.projectId;
    if (query.tags?.length) where.tags = { hasEvery: query.tags };

    if (query.dueBefore || query.dueAfter) {
      where.dueAt = {};
      if (query.dueBefore) where.dueAt.lte = new Date(query.dueBefore);
      if (query.dueAfter) where.dueAt.gte = new Date(query.dueAfter);
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { notes: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.task.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      include: { project: { select: { id: true, name: true, color: true } } },
    });
  }

  // ── Today view ────────────────────────────────────────────────────────────

  async findToday(userId: string) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    return this.prisma.task.findMany({
      where: {
        userId,
        status: { notIn: [TaskStatus.done, TaskStatus.canceled] },
        OR: [
          // Due today
          { dueAt: { gte: todayStart, lte: todayEnd } },
          // Overdue (past due but not done)
          { dueAt: { lt: todayStart } },
          // Scheduled to start today
          { startAt: { gte: todayStart, lte: todayEnd } },
        ],
      },
      orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }],
      include: { project: { select: { id: true, name: true, color: true } } },
    });
  }

  // ── Upcoming view (next N days) ───────────────────────────────────────────

  async findUpcoming(userId: string, days = 14) {
    const now = new Date();
    const windowEnd = addDays(endOfDay(now), days);

    return this.prisma.task.findMany({
      where: {
        userId,
        status: { notIn: [TaskStatus.done, TaskStatus.canceled] },
        dueAt: { gt: endOfDay(now), lte: windowEnd },
      },
      orderBy: [{ dueAt: 'asc' }, { priority: 'asc' }],
      include: { project: { select: { id: true, name: true, color: true } } },
    });
  }

  // ── Backlog view ──────────────────────────────────────────────────────────

  async findBacklog(userId: string) {
    return this.prisma.task.findMany({
      where: {
        userId,
        status: { in: [TaskStatus.backlog, TaskStatus.next] },
        dueAt: null,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      include: { project: { select: { id: true, name: true, color: true } } },
    });
  }

  // ── Find one ──────────────────────────────────────────────────────────────

  async findOne(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
      include: {
        project: { select: { id: true, name: true, color: true } },
        activityLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
        recurrenceChildren: { select: { id: true, title: true, status: true, dueAt: true } },
      },
    });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);
    return task;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    await this.assertOwner(userId, taskId);

    const existing = await this.prisma.task.findUnique({ where: { id: taskId } });

    const data: Prisma.TaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.projectId !== undefined) data.project = { connect: { id: dto.projectId } };
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.estimateMinutes !== undefined) data.estimateMinutes = dto.estimateMinutes;
    if (dto.recurrenceRule !== undefined) data.recurrenceRule = dto.recurrenceRule;
    if (dto.dueAt !== undefined) data.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dto.startAt !== undefined) data.startAt = dto.startAt ? new Date(dto.startAt) : null;

    // Handle status transitions
    if (dto.status !== undefined && dto.status !== existing?.status) {
      data.status = dto.status;
      if (dto.status === TaskStatus.done) {
        data.completedAt = new Date();
        await this.logActivity(taskId, userId, ActivityAction.completed, { from: existing?.status });
      } else {
        await this.logActivity(taskId, userId, ActivityAction.status_changed, {
          from: existing?.status,
          to: dto.status,
        });
      }
    } else {
      await this.logActivity(taskId, userId, ActivityAction.updated, { changes: dto });
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data,
      include: { project: { select: { id: true, name: true, color: true } } },
    });
  }

  // ── Status transition ─────────────────────────────────────────────────────

  async transition(userId: string, taskId: string, status: TaskStatus) {
    await this.assertOwner(userId, taskId);
    const existing = await this.prisma.task.findUnique({ where: { id: taskId } });

    const completedAt = status === TaskStatus.done ? new Date() : null;
    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: { status, completedAt },
      include: { project: { select: { id: true, name: true, color: true } } },
    });

    await this.logActivity(taskId, userId,
      status === TaskStatus.done ? ActivityAction.completed : ActivityAction.status_changed,
      { from: existing?.status, to: status },
    );

    return task;
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async remove(userId: string, taskId: string) {
    await this.assertOwner(userId, taskId);
    await this.logActivity(taskId, userId, ActivityAction.deleted, {});
    return this.prisma.task.delete({ where: { id: taskId } });
  }

  // ── Activity log ──────────────────────────────────────────────────────────

  private async logActivity(taskId: string, userId: string, action: ActivityAction, payload: object) {
    await this.prisma.activityLog.create({ data: { taskId, userId, action, payload } });
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  private async assertOwner(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId } });
    if (!task) throw new NotFoundException(`Task ${taskId} not found`);
    if (task.userId !== userId) throw new ForbiddenException();
  }

  /** Used by jobs to find overdue/today tasks for digest */
  async findForDigest(userId: string) {
    const now = new Date();
    const todayEnd = endOfDay(now);

    const [overdue, today] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          userId,
          status: { notIn: [TaskStatus.done, TaskStatus.canceled] },
          dueAt: { lt: startOfDay(now) },
        },
        orderBy: { priority: 'asc' },
        take: 10,
      }),
      this.prisma.task.findMany({
        where: {
          userId,
          status: { notIn: [TaskStatus.done, TaskStatus.canceled] },
          dueAt: { gte: startOfDay(now), lte: todayEnd },
        },
        orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }],
      }),
    ]);

    const top3 = await this.prisma.task.findMany({
      where: {
        userId,
        status: { notIn: [TaskStatus.done, TaskStatus.canceled] },
        priority: { in: ['P0', 'P1'] },
      },
      orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }],
      take: 3,
    });

    return { overdue, today, top3 };
  }
}
