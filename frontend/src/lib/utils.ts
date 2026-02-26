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

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; hex: string }> = {
  P0: { label: 'Critical', color: 'text-white', bg: 'bg-[#333333]', hex: '#333333' },
  P1: { label: 'High', color: 'text-white', bg: 'bg-[#401694]', hex: '#401694' },
  P2: { label: 'Medium', color: 'text-white', bg: 'bg-[#5559df]', hex: '#5559df' },
  P3: { label: 'Low', color: 'text-white', bg: 'bg-[#579bfc]', hex: '#579bfc' },
};

// ─── Status ──────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; hex: string }> = {
  backlog: { label: 'Not Started', color: 'text-white', bg: 'bg-[#c4c4c4]', hex: '#c4c4c4' },
  next: { label: 'Next Up', color: 'text-white', bg: 'bg-[#579bfc]', hex: '#579bfc' },
  in_progress: { label: 'Working on it', color: 'text-monday-text', bg: 'bg-[#fdab3d]', hex: '#fdab3d' },
  waiting: { label: 'Waiting', color: 'text-white', bg: 'bg-[#a25ddc]', hex: '#a25ddc' },
  done: { label: 'Done', color: 'text-white', bg: 'bg-[#00c875]', hex: '#00c875' },
  canceled: { label: 'Canceled', color: 'text-white', bg: 'bg-[#999999]', hex: '#999999' },
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

// ─── Tag colors (Monday-style tinted pills) ──────────────────────────────────

const TAG_COLORS = [
  'bg-[#e2445c]/15 text-[#e2445c]',
  'bg-[#579bfc]/15 text-[#579bfc]',
  'bg-[#00c875]/15 text-[#00c875]',
  'bg-[#fdab3d]/15 text-[#b07a1e]',
  'bg-[#a25ddc]/15 text-[#a25ddc]',
  'bg-[#66ccff]/15 text-[#0073ea]',
];

export function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// ─── Group header colors (rotating) ──────────────────────────────────────────

const GROUP_COLORS = ['#579bfc', '#00c875', '#a25ddc', '#fdab3d', '#e2445c', '#66ccff'];

export function groupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}
