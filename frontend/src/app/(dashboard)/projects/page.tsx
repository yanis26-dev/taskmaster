'use client';

import { useState } from 'react';
import { useProjects, useCreateProject } from '@/hooks/useTasks';
import { PageHeader } from '@/components/layout/PageHeader';
import { FolderOpen, Plus, Archive } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#6b7280',
];

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const { mutate: createProject, isPending } = useCreateProject();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createProject({ name: name.trim(), color }, {
      onSuccess: () => { setShowCreate(false); setName(''); setColor(COLORS[0]); },
    });
  }

  const active = projects?.filter((p) => !p.archived) ?? [];
  const archived = projects?.filter((p) => p.archived) ?? [];

  return (
    <div>
      <PageHeader
        icon={<FolderOpen className="h-5 w-5" />}
        title="Projects"
        badge={active.length > 0 ? String(active.length) : undefined}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New Project
          </button>
        }
      />

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">New Project</h3>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="w-full text-sm bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none pb-2 text-gray-900 dark:text-white"
          />
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  'h-5 w-5 rounded-full transition-transform',
                  color === c && 'ring-2 ring-offset-2 ring-gray-400 scale-110',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div
                className="h-8 w-8 rounded-lg flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</p>
                {project.description && (
                  <p className="text-xs text-gray-400 truncate">{project.description}</p>
                )}
              </div>
              {project._count?.tasks !== undefined && (
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {project._count.tasks} tasks
                </span>
              )}
            </Link>
          ))}

          {archived.length > 0 && (
            <details className="mt-6">
              <summary className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300">
                <Archive className="h-3.5 w-3.5" />
                Archived ({archived.length})
              </summary>
              <div className="mt-2 space-y-2 opacity-60">
                {archived.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="h-6 w-6 rounded-md" style={{ backgroundColor: project.color }} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{project.name}</span>
                  </Link>
                ))}
              </div>
            </details>
          )}

          {active.length === 0 && !showCreate && (
            <div className="text-center py-16 text-gray-400">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No projects yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
