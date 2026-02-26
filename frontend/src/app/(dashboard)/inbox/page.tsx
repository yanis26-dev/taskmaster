'use client';

import { useState } from 'react';
import { useTasksQuery } from '@/hooks/useTasks';
import { TaskList } from '@/components/tasks/TaskList';
import { PageHeader } from '@/components/layout/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types';

const FILTER_TABS: { label: string; status?: TaskStatus[] }[] = [
  { label: 'Active' },
  { label: 'Next', status: ['next'] },
  { label: 'In Progress', status: ['in_progress'] },
  { label: 'Waiting', status: ['waiting'] },
  { label: 'All', status: ['backlog', 'next', 'in_progress', 'waiting', 'done', 'canceled'] },
];

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState(0);
  const tab = FILTER_TABS[activeTab];

  const { data: tasks, isLoading } = useTasksQuery(
    tab.status ? { status: tab.status } : undefined,
  );

  return (
    <div>
      <PageHeader
        icon={<Icon icon="solar:list-bold" className="h-5 w-5" />}
        title="All Tasks"
        badge={tasks ? String(tasks.length) : undefined}
        showViewSwitcher
      />

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 border-b border-monday-border-light">
        {FILTER_TABS.map((f, i) => (
          <button
            key={f.label}
            onClick={() => setActiveTab(i)}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              i === activeTab
                ? 'border-monday-primary text-monday-primary'
                : 'border-transparent text-monday-text-secondary hover:text-monday-text',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-monday-surface-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <TaskList tasks={tasks ?? []} groupByStatus={activeTab === FILTER_TABS.length - 1} />
      )}
    </div>
  );
}
