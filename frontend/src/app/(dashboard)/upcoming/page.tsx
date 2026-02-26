'use client';

import { useState } from 'react';
import { format, startOfDay, addDays, eachDayOfInterval } from 'date-fns';
import { useUpcomingTasks } from '@/hooks/useTasks';
import { TaskItem } from '@/components/tasks/TaskItem';
import { PageHeader } from '@/components/layout/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

export default function UpcomingPage() {
  const [days, setDays] = useState<14 | 30>(14);
  const { data: tasks, isLoading } = useUpcomingTasks(days);

  // Group tasks by date
  const today = startOfDay(new Date());
  const windowEnd = addDays(today, days);
  const dateRange = eachDayOfInterval({ start: addDays(today, 1), end: windowEnd });

  const tasksByDate = dateRange.reduce<Record<string, Task[]>>((acc, day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    acc[dateKey] = (tasks ?? []).filter((t) => {
      if (!t.dueAt) return false;
      return format(new Date(t.dueAt), 'yyyy-MM-dd') === dateKey;
    });
    return acc;
  }, {});

  const totalTasks = tasks?.length ?? 0;

  return (
    <div>
      <PageHeader
        icon={<Icon icon="solar:calendar-line-duotone" className="h-5 w-5" />}
        title="Upcoming"
        badge={totalTasks > 0 ? String(totalTasks) : undefined}
        actions={
          <div className="flex rounded-lg border border-monday-border overflow-hidden text-sm">
            {([14, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  days === d
                    ? 'bg-monday-primary text-white'
                    : 'text-monday-text-secondary hover:bg-monday-surface-secondary',
                )}
              >
                {d} days
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-5 w-24 bg-monday-surface-secondary rounded animate-pulse mb-2" />
              <div className="h-10 bg-monday-surface-secondary rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {dateRange.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate[dateKey] ?? [];
            if (dayTasks.length === 0) return null;

            return (
              <section key={dateKey}>
                <h2 className="text-sm font-semibold text-monday-text-secondary mb-2 flex items-center gap-2">
                  <span>{format(day, 'EEEE')}</span>
                  <span className="text-monday-text-tertiary">·</span>
                  <span className="font-normal">{format(day, 'MMM d')}</span>
                </h2>
                <table className="monday-table w-full">
                  <tbody>
                    {dayTasks.map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}

          {totalTasks === 0 && (
            <div className="text-center py-16 text-monday-text-tertiary">
              <p>No upcoming tasks in the next {days} days</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
