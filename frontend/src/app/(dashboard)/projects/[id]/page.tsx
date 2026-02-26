'use client';

import { use } from 'react';
import { useProjectTasks, useProjects, useCreateProject } from '@/hooks/useTasks';
import { TaskList } from '@/components/tasks/TaskList';
import { PageHeader } from '@/components/layout/PageHeader';
import { useTaskStore } from '@/store/taskStore';
import { FolderOpen, Plus } from 'lucide-react';
import { projectsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';

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

  if (!project) return <div className="animate-pulse h-8 w-40 bg-gray-100 dark:bg-gray-800 rounded" />;

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
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add task
          </button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
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
