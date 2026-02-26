'use client';

import { use } from 'react';
import { useProjectTasks, useProjects } from '@/hooks/useTasks';
import { TaskList } from '@/components/tasks/TaskList';
import { PageHeader } from '@/components/layout/PageHeader';
import { useTaskStore } from '@/store/taskStore';
import { Icon } from '@/components/ui/Icon';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: projects } = useProjects();
  const { data: tasks, isLoading } = useProjectTasks(id);
  const { setQuickCaptureOpen, setQuickCaptureDefaults } = useTaskStore();

  const project = projects?.find((p) => p.id === id);

  function handleNewTask() {
    setQuickCaptureDefaults({ projectId: id });
    setQuickCaptureOpen(true);
  }

  if (!project) return <div className="animate-pulse h-8 w-40 bg-monday-surface-secondary rounded" />;

  return (
    <div>
      <PageHeader
        icon={
          <div
            className="h-5 w-5 rounded"
            style={{ backgroundColor: project.color }}
          />
        }
        title={project.name}
        subtitle={project.description}
        badge={tasks ? String(tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled').length) : undefined}
        actions={
          <button
            onClick={handleNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-monday-primary hover:bg-monday-primary-selected rounded-lg transition-colors"
          >
            <Icon icon="solar:add-circle-bold" className="h-3.5 w-3.5" /> Add task
          </button>
        }
        showViewSwitcher
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-monday-surface-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <TaskList
          tasks={tasks ?? []}
          showProject={false}
          groupByStatus
          emptyMessage="No tasks in this project yet"
        />
      )}
    </div>
  );
}
