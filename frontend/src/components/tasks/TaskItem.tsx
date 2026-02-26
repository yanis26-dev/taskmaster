'use client';

import { useTransitionTask } from '@/hooks/useTasks';
import { useTaskStore } from '@/store/taskStore';
import { cn, formatDueDate, isOverdue, PRIORITY_CONFIG, STATUS_CONFIG, tagColor } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import type { Task } from '@/types';

interface TaskItemProps {
  task: Task;
  showProject?: boolean;
}

export function TaskItem({ task, showProject = true }: TaskItemProps) {
  const { mutate: transition } = useTransitionTask();
  const { setSelectedTaskId } = useTaskStore();
  const isDone = task.status === 'done' || task.status === 'canceled';
  const overdue = isOverdue(task.dueAt) && !isDone;
  const priority = PRIORITY_CONFIG[task.priority];
  const status = STATUS_CONFIG[task.status];

  function handleCheck(e: React.MouseEvent) {
    e.stopPropagation();
    transition({ id: task.id, status: isDone ? 'next' : 'done' });
  }

  return (
    <tr
      className="group cursor-pointer"
      onClick={() => setSelectedTaskId(task.id)}
    >
      {/* Checkbox */}
      <td className="w-10 text-center">
        <button
          onClick={handleCheck}
          className={cn(
            'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors mx-auto',
            isDone
              ? 'bg-monday-status-done border-monday-status-done'
              : 'border-monday-text-tertiary hover:border-monday-primary',
          )}
          aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
        >
          {isDone && (
            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </td>

      {/* Title */}
      <td className="min-w-[200px]">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm text-monday-text truncate', isDone && 'line-through text-monday-text-tertiary')}>
            {task.title}
          </span>
          {task.recurrenceRule && (
            <Icon icon="solar:restart-bold" className="h-3 w-3 text-monday-text-tertiary flex-shrink-0" />
          )}
          {task.externalUrl && !task.externalMissing && (
            <a
              href={task.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-monday-text-tertiary hover:text-monday-primary transition-colors"
            >
              <Icon icon="solar:square-arrow-right-up-bold" className="h-3 w-3" />
            </a>
          )}
        </div>
      </td>

      {/* Status pill */}
      <td className="w-32">
        <span className={cn('inline-block px-3 py-1 rounded-full text-xs font-medium text-center min-w-[90px]', status.bg, status.color)}>
          {status.label}
        </span>
      </td>

      {/* Priority pill */}
      <td className="w-28">
        <span className={cn('inline-block px-3 py-1 rounded-full text-xs font-medium text-center min-w-[70px]', priority.bg, priority.color)}>
          {priority.label}
        </span>
      </td>

      {/* Due date */}
      <td className="w-28">
        {task.dueAt && (
          <span className={cn('text-sm', overdue ? 'text-[#e2445c] font-medium' : 'text-monday-text-secondary')}>
            {overdue && '! '}{formatDueDate(task.dueAt)}
          </span>
        )}
      </td>

      {/* Project */}
      {showProject !== false && (
        <td className="w-32">
          {task.project && (
            <span className="flex items-center gap-1.5 text-sm text-monday-text-secondary">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: task.project.color }} />
              <span className="truncate">{task.project.name}</span>
            </span>
          )}
        </td>
      )}

      {/* Tags */}
      <td className="w-40">
        <div className="flex gap-1 flex-wrap">
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className={cn('px-2 py-0.5 rounded-full text-xs font-medium', tagColor(tag))}>
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-xs text-monday-text-tertiary">+{task.tags.length - 2}</span>
          )}
        </div>
      </td>
    </tr>
  );
}
