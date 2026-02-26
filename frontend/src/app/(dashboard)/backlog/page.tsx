'use client';

import { useState } from 'react';
import { useBacklogTasks } from '@/hooks/useTasks';
import { TaskList } from '@/components/tasks/TaskList';
import { PageHeader } from '@/components/layout/PageHeader';
import { Icon } from '@/components/ui/Icon';
import type { TaskPriority } from '@/types';
import { cn, PRIORITY_CONFIG } from '@/lib/utils';

const PRIORITIES: TaskPriority[] = ['P0', 'P1', 'P2', 'P3'];

export default function BacklogPage() {
  const { data: tasks, isLoading } = useBacklogTasks();
  const [filterPriority, setFilterPriority] = useState<TaskPriority | null>(null);

  const filtered = filterPriority
    ? (tasks ?? []).filter((t) => t.priority === filterPriority)
    : tasks ?? [];

  return (
    <div>
      <PageHeader
        icon={<Icon icon="solar:archive-bold" className="h-5 w-5" />}
        title="Backlog"
        subtitle="Unscheduled tasks"
        badge={tasks ? String(tasks.length) : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Icon icon="solar:tuning-2-bold" className="h-4 w-4 text-monday-text-tertiary" />
            <div className="flex gap-1">
              {PRIORITIES.map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(filterPriority === p ? null : p)}
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-semibold transition-colors',
                      filterPriority === p
                        ? `${cfg.bg} ${cfg.color}`
                        : 'text-monday-text-tertiary hover:text-monday-text-secondary',
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        }
        showViewSwitcher
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-monday-surface-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <TaskList tasks={filtered} emptyMessage="No backlog tasks — you're all caught up!" />
      )}
    </div>
  );
}
