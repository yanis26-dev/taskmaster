'use client';

import { useState } from 'react';
import { TaskItem } from './TaskItem';
import { Icon } from '@/components/ui/Icon';
import { useTaskStore } from '@/store/taskStore';
import { cn, STATUS_CONFIG, groupColor } from '@/lib/utils';
import type { Task } from '@/types';

interface TaskListProps {
  tasks: Task[];
  emptyMessage?: string;
  showProject?: boolean;
  groupByStatus?: boolean;
}

const STATUS_ORDER = ['in_progress', 'next', 'waiting', 'backlog', 'done', 'canceled'];

export function TaskList({ tasks, emptyMessage = 'No tasks', showProject = true, groupByStatus = false }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-monday-text-tertiary">
        <p className="text-base">{emptyMessage}</p>
        <p className="text-sm mt-1">Press <kbd className="px-1.5 py-0.5 rounded bg-monday-surface-secondary text-xs font-mono">N</kbd> to create one</p>
      </div>
    );
  }

  if (!groupByStatus) {
    return (
      <div className="px-6 py-4">
        <GroupSection
          label="Tasks"
          count={tasks.length}
          color={groupColor(0)}
          tasks={tasks}
          showProject={showProject}
          defaultOpen
        />
      </div>
    );
  }

  const grouped = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, status) => {
    const group = tasks.filter((t) => t.status === status);
    if (group.length) acc[status] = group;
    return acc;
  }, {});

  return (
    <div className="px-6 py-4 space-y-6">
      {Object.entries(grouped).map(([status, group], idx) => (
        <GroupSection
          key={status}
          label={STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label ?? status}
          count={group.length}
          color={groupColor(idx)}
          tasks={group}
          showProject={showProject}
          defaultOpen
        />
      ))}
    </div>
  );
}

function GroupSection({
  label, count, color, tasks, showProject, defaultOpen = true,
}: {
  label: string;
  count: number;
  color: string;
  tasks: Task[];
  showProject?: boolean;
  defaultOpen?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  const { setQuickCaptureOpen } = useTaskStore();

  return (
    <div className="mb-2">
      {/* Group header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg cursor-pointer select-none"
        style={{
          borderLeft: `4px solid ${color}`,
          backgroundColor: `${color}10`,
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <Icon
          icon={collapsed ? 'solar:alt-arrow-right-bold' : 'solar:alt-arrow-down-bold'}
          className="h-3.5 w-3.5 text-monday-text-secondary"
        />
        <span className="text-sm font-semibold" style={{ color }}>{label}</span>
        <span className="text-xs text-monday-text-tertiary">{count}</span>
      </div>

      {!collapsed && (
        <div className="bg-white rounded-b-lg border border-monday-border-light border-t-0 overflow-hidden">
          <table className="monday-table">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th className="min-w-[200px]">Task</th>
                <th className="w-32">Status</th>
                <th className="w-28">Priority</th>
                <th className="w-28">Due Date</th>
                {showProject !== false && <th className="w-32">Project</th>}
                <th className="w-40">Tags</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} showProject={showProject} />
              ))}
              <tr>
                <td colSpan={showProject !== false ? 7 : 6} className="!border-b-0">
                  <button
                    onClick={() => setQuickCaptureOpen(true)}
                    className="flex items-center gap-2 px-1 py-1 text-sm text-monday-text-tertiary hover:text-monday-primary transition-colors"
                  >
                    <Icon icon="solar:add-circle-bold" className="h-4 w-4" />
                    Add task
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
