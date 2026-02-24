'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, projectsApi, settingsApi } from '@/lib/api';
import type { CreateTaskInput, UpdateTaskInput, TaskStatus, TaskFilters, CreateProjectInput } from '@/types';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const qk = {
  tasks: (filters?: TaskFilters) => ['tasks', filters] as const,
  todayTasks: () => ['tasks', 'today'] as const,
  upcomingTasks: (days?: number) => ['tasks', 'upcoming', days] as const,
  backlogTasks: () => ['tasks', 'backlog'] as const,
  task: (id: string) => ['task', id] as const,
  projects: () => ['projects'] as const,
  projectTasks: (id: string) => ['project-tasks', id] as const,
  settings: () => ['settings'] as const,
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function useTasksQuery(filters?: TaskFilters) {
  return useQuery({ queryKey: qk.tasks(filters), queryFn: () => tasksApi.list(filters) });
}

export function useTodayTasks() {
  return useQuery({ queryKey: qk.todayTasks(), queryFn: tasksApi.today, staleTime: 30_000 });
}

export function useUpcomingTasks(days?: number) {
  return useQuery({
    queryKey: qk.upcomingTasks(days),
    queryFn: () => tasksApi.upcoming(days),
    staleTime: 60_000,
  });
}

export function useBacklogTasks() {
  return useQuery({ queryKey: qk.backlogTasks(), queryFn: tasksApi.backlog, staleTime: 60_000 });
}

export function useTask(id: string) {
  return useQuery({ queryKey: qk.task(id), queryFn: () => tasksApi.get(id), enabled: !!id });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      tasksApi.update(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: qk.task(id) });
    },
  });
}

export function useTransitionTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.transition(id, status),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.setQueryData(qk.task(task.id), task);
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({ queryKey: qk.projects(), queryFn: projectsApi.list, staleTime: 120_000 });
}

export function useProjectTasks(id: string) {
  return useQuery({
    queryKey: qk.projectTasks(id),
    queryFn: () => projectsApi.getTasks(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.projects() }),
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function useSettings() {
  return useQuery({ queryKey: qk.settings(), queryFn: settingsApi.get });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.settings() }),
  });
}
