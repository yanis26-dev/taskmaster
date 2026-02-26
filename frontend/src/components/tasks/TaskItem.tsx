'use client';

import { useTransitionTask } from '@/hooks/useTasks';
import { useTaskStore } from '@/store/taskStore';
import { cn, formatDueDate, isOverdue, PRIORITY_CONFIG, tagColor } from '@/lib/utils';
import { RefreshCw, ExternalLink, Repeat } from 'lucide-react';
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

  function handleCheck(e: React.MouseEvent) {
    e.stopPropagation();
    transition({ id: task.id, status: isDone ? 'next' : 'done' });
  }

  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors',
        isDone && 'opacity-50',
      )}
      onClick={() => setSelectedTaskId(task.id)}
    >
      {/* Checkbox */}
      <button
        onClick={handleCheck}
        className={cn(
          'flex-shrink-0 mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors',
          isDone
            ? 'bg-gray-300 border-gray-300 dark:bg-gray-600 dark:border-gray-600'
            : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400',
        )}
        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
      >
        {isDone && (
          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {/* Priority badge */}
          <span className={cn('text-xs font-semibold tabular-nums', priority.color)}>
            {task.priority}
          </span>

          {/* Title */}
          <span className={cn('text-sm text-gray-800 dark:text-gray-200 truncate', isDone && 'line-through')}>
            {task.title}
          </span>

          {/* Recurrence icon */}
          {task.recurrenceRule && (
            <Repeat className="h-3 w-3 text-gray-400 flex-shrink-0" />
          )}

          {/* External link */}
          {task.externalUrl && !task.externalMissing && (
            <a
              href={task.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Due date */}
          {task.dueAt && (
            <span className={cn('text-xs', overdue ? 'text-red-500 font-medium' : 'text-gray-400')}>
              {overdue && '!'} {formatDueDate(task.dueAt)}
            </span>
          )}

          {/* Project */}
          {showProject && task.project && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: task.project.color }}
              />
              {task.project.name}
            </span>
          )}

          {/* Tags */}
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={cn('px-1.5 py-0.5 rounded text-xs', tagColor(tag))}
            >
              {tag}
            </span>
          ))}

          {/* Source badge */}
          {task.source !== 'manual' && (
            <span className="text-xs text-gray-300 dark:text-gray-600">
              {task.source === 'outlook_email' ? '📧' : task.source === 'outlook_calendar' ? '📅' : '⚙️'}
            </span>
          )}
        </div>
      </div>

      {/* Estimate */}
      {task.estimateMinutes && (
        <span className="flex-shrink-0 text-xs text-gray-300 dark:text-gray-600 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
          {task.estimateMinutes}m
        </span>
      )}
    </div>
  );
}
