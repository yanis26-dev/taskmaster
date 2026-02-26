import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns';
import type { TaskPriority, TaskStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDueDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isThisWeek(date)) return format(date, 'EEEE'); // "Monday"
  return format(date, 'MMM d'); // "Jan 15"
}

export function isDueSoon(dateStr?: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return isPast(date) || isToday(date);
}

export function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return isPast(date) && !isToday(date);
}

// ─── Priority ─────────────────────────────────────────────────────────────────

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  P0: { label: 'P0', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
  P1: { label: 'P1', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950' },
  P2: { label: 'P2', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
  P3: { label: 'P3', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900' },
};

// ─── Status ──────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: 'text-gray-500' },
  next: { label: 'Next', color: 'text-blue-600' },
  in_progress: { label: 'In Progress', color: 'text-yellow-600' },
  waiting: { label: 'Waiting', color: 'text-purple-600' },
  done: { label: 'Done', color: 'text-green-600' },
  canceled: { label: 'Canceled', color: 'text-gray-400' },
};

export const TERMINAL_STATUSES: TaskStatus[] = ['done', 'canceled'];

// ─── Recurrence labels ────────────────────────────────────────────────────────

export const COMMON_RRULES = [
  { label: 'Daily', value: 'FREQ=DAILY' },
  { label: 'Weekdays', value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
  { label: 'Weekly', value: 'FREQ=WEEKLY' },
  { label: 'Biweekly', value: 'FREQ=WEEKLY;INTERVAL=2' },
  { label: 'Monthly', value: 'FREQ=MONTHLY' },
  { label: 'Quarterly', value: 'FREQ=MONTHLY;INTERVAL=3' },
];

// ─── Tag colors (deterministic from string hash) ──────────────────────────────

const TAG_COLORS = [
  'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
];

export function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}
