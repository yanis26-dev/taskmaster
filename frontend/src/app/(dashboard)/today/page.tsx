'use client';

import { format } from 'date-fns';
import { useTodayTasks } from '@/hooks/useTasks';
import { TaskList } from '@/components/tasks/TaskList';
import { PageHeader } from '@/components/layout/PageHeader';
import { Icon } from '@/components/ui/Icon';

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
        icon={<Icon icon="solar:calendar-bold" className="h-5 w-5" />}
        title="Today"
        subtitle={format(today, 'EEEE, MMMM d')}
        badge={total > 0 ? `${done}/${total}` : undefined}
        showViewSwitcher
      />

      {isLoading ? (
        <TaskSkeleton />
      ) : (
        <>
          {overdue.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-[#e2445c] mb-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#e2445c]" />
                Overdue ({overdue.length})
              </h2>
              <TaskList tasks={overdue} />
            </section>
          )}

          <section>
            {overdue.length > 0 && (
              <h2 className="text-sm font-semibold text-monday-text-secondary mb-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-monday-primary" />
                Today
              </h2>
            )}
            <TaskList tasks={todayTasks} emptyMessage={
              overdue.length === 0 ? 'No tasks today — enjoy your day!' : 'No additional tasks today'
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
        <div key={i} className="h-10 bg-monday-surface-secondary rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
