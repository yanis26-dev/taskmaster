'use client';

import { format } from 'date-fns';
import { useTodayTasks } from '@/hooks/useTasks';
import { TaskList } from '@/components/tasks/TaskList';
import { PageHeader } from '@/components/layout/PageHeader';
import { Calendar } from 'lucide-react';

export default function TodayPage() {
  const { data: tasks, isLoading } = useTodayTasks();

  const today = new Date();
  const overdue = tasks?.filter((t) => {
    if (!t.dueAt) return false;
    return new Date(t.dueAt) < new Date(today.toDateString());
  }) ?? [];
  const todayTasks = tasks?.filter((t) => {
    if (!t.dueAt) return false;
    return new Date(t.dueAt).toDateString() === today.toDateString();
  }) ?? [];

  const total = tasks?.filter((t) => t.status !== 'done' && t.status !== 'canceled').length ?? 0;
  const done = tasks?.filter((t) => t.status === 'done').length ?? 0;

  return (
    <div>
      <PageHeader
        icon={<Calendar className="h-5 w-5" />}
        title="Today"
        subtitle={format(today, 'EEEE, MMMM d')}
        badge={total > 0 ? `${done}/${total}` : undefined}
      />

      {isLoading ? (
        <TaskSkeleton />
      ) : (
        <>
          {overdue.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Overdue ({overdue.length})
              </h2>
              <TaskList tasks={overdue} />
            </section>
          )}

          <section>
            {overdue.length > 0 && (
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Today
              </h2>
            )}
            <TaskList tasks={todayTasks} emptyMessage={
              overdue.length === 0 ? '🎉 No tasks today — enjoy your day!' : 'No additional tasks today'
            } />
          </section>
        </>
      )}
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
