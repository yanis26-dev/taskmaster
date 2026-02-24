// ─── Core domain types (mirrors Prisma schema) ──────────────────────────────

export type TaskStatus = 'backlog' | 'next' | 'in_progress' | 'waiting' | 'done' | 'canceled';
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type TaskSource = 'manual' | 'outlook_email' | 'outlook_calendar' | 'automation';

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  archived: boolean;
  createdAt: string;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  userId: string;
  projectId?: string;
  project?: Pick<Project, 'id' | 'name' | 'color'>;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string;
  startAt?: string;
  completedAt?: string;
  tags: string[];
  estimateMinutes?: number;
  recurrenceRule?: string;
  source: TaskSource;
  externalUrl?: string;
  externalMissing?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  action: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  timezone: string;
  digestEnabled: boolean;
  digestTime: string;
  autoEmailToTask: boolean;
  autoCalendarToTask: boolean;
  autoTaskToCalendar: boolean;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  microsoftId?: string;
  role: UserRole;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  microsoftId?: string;
  _count: { tasks: number };
}

export interface Invitation {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: { name: string; email: string };
  inviteLink?: string;
}

export interface OutlookSubscription {
  id: string;
  graphSubId: string;
  resource: string;
  changeType: string;
  expiresAt: string;
  active: boolean;
}

// ─── API request types ──────────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  notes?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string;
  startAt?: string;
  projectId?: string;
  tags?: string[];
  estimateMinutes?: number;
  recurrenceRule?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  completedAt?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  projectId?: string;
  tags?: string[];
  dueBefore?: string;
  dueAfter?: string;
  q?: string;
  includeCompleted?: boolean;
}
