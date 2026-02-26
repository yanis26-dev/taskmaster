'use client';

import { useEffect, useState } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { tasksApi } from '@/lib/api';
import { cn, PRIORITY_CONFIG } from '@/lib/utils';
import { Search, X } from 'lucide-react';
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

      <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600"
          />
          {loading && (
            <div className="h-4 w-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          )}
          <button onClick={() => setSearchOpen(false)}>
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 && query.length > 1 && !loading && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No tasks found for &quot;{query}&quot;
            </div>
          )}
          {results.length === 0 && query.length <= 1 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
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
              className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <span className={cn('text-xs font-semibold mt-0.5 flex-shrink-0', PRIORITY_CONFIG[task.priority].color)}>
                {task.priority}
              </span>
              <div className="min-w-0">
                <p className={cn('text-sm text-gray-800 dark:text-gray-200 truncate', task.status === 'done' && 'line-through text-gray-400')}>
                  {task.title}
                </p>
                {task.project && (
                  <p className="text-xs text-gray-400 mt-0.5">{task.project.name}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-xs text-gray-300 dark:text-gray-600">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
