'use client';

import { TaskItem } from './TaskItem';
import type { Task } from '@/types';

interface TaskListProps {
  tasks: Task[];
  emptyMessage?: string;
  showProject?: boolean;
  groupByStatus?: boolean;
}

const STATUS_ORDER = ['in_progress', 'next', 'waiting', 'backlog', 'done', 'canceled'];
const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  next: 'Next Up',
  waiting: 'Waiting',
  backlog: 'Backlog',
  done: 'Done',
  canceled: 'Canceled',
};

export function TaskList({ tasks, emptyMessage = 'No tasks', showProject = true, groupByStatus = false }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-600">
        <p className="text-base">{emptyMessage}</p>
        <p className="text-sm mt-1">Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">N</kbd> to create one</p>
      </div>
    );
  }

  if (!groupByStatus) {
    return (
      <div className="space-y-0.5">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} showProject={showProject} />
        ))}
      </div>
    );
  }

  // Group by status
  const grouped = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, status) => {
    const group = tasks.filter((t) => t.status === status);
    if (group.length) acc[status] = group;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([status, group]) => (
        <div key={status}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            {STATUS_LABELS[status]} ({group.length})
          </h3>
          <div className="space-y-0.5">
            {group.map((task) => (
              <TaskItem key={task.id} task={task} showProject={showProject} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
