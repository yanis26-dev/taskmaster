'use client';

import { useState } from 'react';
import { useProjects, useCreateProject } from '@/hooks/useTasks';
import { PageHeader } from '@/components/layout/PageHeader';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const COLORS = [
  '#0073ea', '#a25ddc', '#e2445c', '#ef4444',
  '#f97316', '#fdab3d', '#00c875', '#10b981',
  '#06b6d4', '#579bfc', '#676879',
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
        icon={<Icon icon="solar:folder-open-bold" className="h-5 w-5" />}
        title="Projects"
        badge={active.length > 0 ? String(active.length) : undefined}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-monday-primary hover:bg-monday-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Icon icon="solar:add-circle-bold" className="h-3.5 w-3.5" /> New Project
          </button>
        }
      />

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border border-monday-border bg-white">
          <h3 className="text-sm font-semibold text-monday-text-secondary mb-3">New Project</h3>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="w-full text-sm bg-transparent border-b border-monday-border-light outline-none pb-2 text-monday-text"
          />
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  'h-5 w-5 rounded-full transition-transform',
                  color === c && 'ring-2 ring-offset-2 ring-monday-text-tertiary scale-110',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              className="px-3 py-1.5 text-sm bg-monday-primary text-white rounded-lg hover:bg-monday-primary-hover disabled:opacity-50 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-sm text-monday-text-tertiary hover:text-monday-text transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-monday-surface-secondary rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center gap-3 p-4 rounded-xl border border-monday-border-light hover:border-monday-border bg-white hover:bg-monday-surface-secondary transition-colors"
            >
              <div
                className="h-8 w-8 rounded-lg flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-monday-text">{project.name}</p>
                {project.description && (
                  <p className="text-xs text-monday-text-tertiary truncate">{project.description}</p>
                )}
              </div>
              {project._count?.tasks !== undefined && (
                <span className="text-xs text-monday-text-tertiary bg-monday-surface-secondary px-2 py-0.5 rounded-full">
                  {project._count.tasks} tasks
                </span>
              )}
            </Link>
          ))}

          {archived.length > 0 && (
            <details className="mt-6">
              <summary className="flex items-center gap-2 text-sm text-monday-text-tertiary cursor-pointer hover:text-monday-text-secondary">
                <Icon icon="solar:archive-bold" className="h-3.5 w-3.5" />
                Archived ({archived.length})
              </summary>
              <div className="mt-2 space-y-2 opacity-60">
                {archived.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-monday-border-light">
                    <div className="h-6 w-6 rounded-md" style={{ backgroundColor: project.color }} />
                    <span className="text-sm text-monday-text-secondary">{project.name}</span>
                  </Link>
                ))}
              </div>
            </details>
          )}

          {active.length === 0 && !showCreate && (
            <div className="text-center py-16 text-monday-text-tertiary">
              <Icon icon="solar:folder-open-bold" className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No projects yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
