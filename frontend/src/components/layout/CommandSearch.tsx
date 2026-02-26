'use client';

import { useEffect, useState } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { tasksApi } from '@/lib/api';
import { cn, PRIORITY_CONFIG } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import type { Task } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';

export function CommandSearch() {
  const { searchOpen, setSearchOpen, setSelectedTaskId } = useTaskStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    if (!searchOpen) {
      setQuery('');
      setResults([]);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!debouncedQuery.trim() || !searchOpen) {
      setResults([]);
      return;
    }
    setLoading(true);
    tasksApi.list({ q: debouncedQuery, includeCompleted: true })
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery, searchOpen]);

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />

      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-monday-border overflow-hidden animate-fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-monday-border-light">
          <Icon icon="solar:magnifer-bold" className="h-4 w-4 text-monday-text-tertiary flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 text-sm bg-transparent outline-none text-monday-text placeholder-monday-text-tertiary"
          />
          {loading && (
            <div className="h-4 w-4 rounded-full border-2 border-monday-primary border-t-transparent animate-spin" />
          )}
          <button onClick={() => setSearchOpen(false)}>
            <Icon icon="solar:close-circle-bold" className="h-4 w-4 text-monday-text-tertiary hover:text-monday-text" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && query.length > 1 && !loading && (
            <div className="px-4 py-8 text-center text-sm text-monday-text-tertiary">
              No tasks found for &quot;{query}&quot;
            </div>
          )}
          {results.length === 0 && query.length <= 1 && (
            <div className="px-4 py-8 text-center text-sm text-monday-text-tertiary">
              Type to search tasks...
            </div>
          )}
          {results.map((task) => (
            <button
              key={task.id}
              onClick={() => {
                setSelectedTaskId(task.id);
                setSearchOpen(false);
              }}
              className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-monday-surface-secondary transition-colors text-left"
            >
              <span className={cn('text-xs font-semibold mt-0.5 flex-shrink-0', PRIORITY_CONFIG[task.priority].color)}>
                {task.priority}
              </span>
              <div className="min-w-0">
                <p className={cn('text-sm text-monday-text truncate', task.status === 'done' && 'line-through text-monday-text-tertiary')}>
                  {task.title}
                </p>
                {task.project && (
                  <p className="text-xs text-monday-text-tertiary mt-0.5">{task.project.name}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-monday-border-light flex items-center gap-4 text-xs text-monday-text-tertiary">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
