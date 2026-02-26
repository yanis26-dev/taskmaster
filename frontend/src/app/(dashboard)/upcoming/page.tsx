'use client';

import { useState } from 'react';
import { format, startOfDay, addDays, eachDayOfInterval } from 'date-fns';
import { useUpcomingTasks } from '@/hooks/useTasks';
import { TaskItem } from '@/components/tasks/TaskItem';
import { PageHeader } from '@/components/layout/PageHeader';
import { Calendar, ChevronRight } from 'lucide-react';
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
        icon={<Calendar className="h-5 w-5" />}
        title="Upcoming"
        badge={totalTasks > 0 ? String(totalTasks) : undefined}
        actions={
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
            {([14, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  days === d
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
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
              <div className="h-5 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-2" />
              <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
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
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                  <span>{format(day, 'EEEE')}</span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span className="font-normal">{format(day, 'MMM d')}</span>
                </h2>
                <div className="space-y-0.5">
                  {dayTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </section>
            );
          })}

          {totalTasks === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p>No upcoming tasks in the next {days} days</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
