/**
 * Typed API client that wraps fetch calls to the NestJS backend.
 * In Next.js, /api/* is proxied to the backend via next.config.ts rewrites.
 */
import type {
  Task, Project, UserSettings, User, OutlookSubscription,
  AdminUser, Invitation, UserRole, Attachment,
  CreateTaskInput, UpdateTaskInput, CreateProjectInput, TaskFilters,
} from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL ?? '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new ApiError(res.status, body.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  getMe: () => request<User>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  refresh: () => request<{ accessToken: string }>('/auth/refresh', { method: 'POST' }),
  microsoftLoginUrl: () => `${API}/auth/microsoft`,
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

function buildQuery(params: Record<string, unknown> | TaskFilters): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item) => qs.append(k, String(item)));
    else qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const tasksApi = {
  list: (filters?: TaskFilters) =>
    request<Task[]>(`/tasks${buildQuery(filters ?? {})}`),

  today: () => request<Task[]>('/tasks/today'),
  upcoming: (days?: number) => request<Task[]>(`/tasks/upcoming${days ? `?days=${days}` : ''}`),
  backlog: () => request<Task[]>('/tasks/backlog'),

  get: (id: string) => request<Task & { activityLogs: unknown[] }>(`/tasks/${id}`),

  create: (input: CreateTaskInput) =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) }),

  update: (id: string, input: UpdateTaskInput) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  transition: (id: string, status: Task['status']) =>
    request<Task>(`/tasks/${id}/transition`, { method: 'POST', body: JSON.stringify({ status }) }),

  delete: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};

// ─── Projects ────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () => request<Project[]>('/projects'),
  get: (id: string) => request<Project>(`/projects/${id}`),
  getTasks: (id: string) => request<Task[]>(`/projects/${id}/tasks`),
  create: (input: CreateProjectInput) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: Partial<CreateProjectInput & { archived: boolean }>) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  delete: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
};

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingsApi = {
  get: () => request<UserSettings>('/settings'),
  update: (input: Partial<UserSettings>) =>
    request<UserSettings>('/settings', { method: 'PATCH', body: JSON.stringify(input) }),
};

// ─── Outlook ─────────────────────────────────────────────────────────────────

export const outlookApi = {
  getSubscriptions: () => request<OutlookSubscription[]>('/outlook/subscriptions'),
  createMailSub: () => request<OutlookSubscription>('/outlook/subscriptions/mail', { method: 'POST' }),
  createCalendarSub: () => request<OutlookSubscription>('/outlook/subscriptions/calendar', { method: 'POST' }),
  renewSub: (id: string) => request<OutlookSubscription>(`/outlook/subscriptions/${id}/renew`, { method: 'POST' }),
  deleteSub: (id: string) => request<void>(`/outlook/subscriptions/${id}`, { method: 'DELETE' }),
  createFocusBlock: (taskId: string, startTime: string, durationMinutes: number) =>
    request('/outlook/focus-block', {
      method: 'POST',
      body: JSON.stringify({ taskId, startTime, durationMinutes }),
    }),
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminApi = {
  listUsers: () => request<AdminUser[]>('/admin/users'),
  createUser: (data: { email: string; name: string; role: UserRole }) =>
    request<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  changeRole: (id: string, role: UserRole) =>
    request<AdminUser>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  deleteUser: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  listInvitations: () => request<Invitation[]>('/admin/invitations'),
  invite: (email: string) => request<Invitation>('/admin/invitations', { method: 'POST', body: JSON.stringify({ email }) }),
  createInviteLink: (email: string) => request<Invitation>('/admin/invitations/link', { method: 'POST', body: JSON.stringify({ email }) }),
  revokeInvitation: (id: string) => request<void>(`/admin/invitations/${id}`, { method: 'DELETE' }),
};

// ─── Attachments ────────────────────────────────────────────────────────────

export const attachmentsApi = {
  upload: async (taskId: string, file: File): Promise<Attachment> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API}/tasks/${taskId}/attachments`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      throw new ApiError(res.status, body.message ?? res.statusText);
    }
    return res.json() as Promise<Attachment>;
  },

  downloadUrl: (taskId: string, attachmentId: string) =>
    `${API}/tasks/${taskId}/attachments/${attachmentId}`,

  delete: (taskId: string, attachmentId: string) =>
    request<void>(`/tasks/${taskId}/attachments/${attachmentId}`, { method: 'DELETE' }),
};

export { ApiError };
