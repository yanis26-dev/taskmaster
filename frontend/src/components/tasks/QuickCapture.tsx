'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { useCreateTask, useProjects } from '@/hooks/useTasks';
import { attachmentsApi } from '@/lib/api';
import { cn, COMMON_RRULES } from '@/lib/utils';
import { X, CalendarDays, FolderOpen, Tag, Clock, Repeat, Paperclip } from 'lucide-react';
import type { TaskPriority, TaskStatus } from '@/types';

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'P0', label: 'P0', color: 'text-red-500' },
  { value: 'P1', label: 'P1', color: 'text-orange-500' },
  { value: 'P2', label: 'P2', color: 'text-blue-500' },
  { value: 'P3', label: 'P3', color: 'text-gray-400' },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'next', label: 'Next' },
  { value: 'in_progress', label: 'In Progress' },
];

export function QuickCapture() {
  const { quickCaptureOpen, setQuickCaptureOpen, quickCaptureDefaults } = useTaskStore();
  const titleRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: createTask, isPending } = useCreateTask();
  const { data: projects } = useProjects();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('P2');
  const [status, setStatus] = useState<TaskStatus>('backlog');
  const [dueAt, setDueAt] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tags, setTags] = useState('');
  const [estimateMinutes, setEstimateMinutes] = useState('');
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Apply defaults when opened
  useEffect(() => {
    if (quickCaptureOpen) {
      setTitle('');
      setNotes('');
      setPriority((quickCaptureDefaults.priority as TaskPriority) ?? 'P2');
      setStatus((quickCaptureDefaults.status as TaskStatus) ?? 'backlog');
      setDueAt(quickCaptureDefaults.dueAt?.slice(0, 10) ?? '');
      setProjectId(quickCaptureDefaults.projectId ?? '');
      setTags((quickCaptureDefaults.tags ?? []).join(', '));
      setEstimateMinutes(String(quickCaptureDefaults.estimateMinutes ?? ''));
      setRecurrenceRule('');
      setFiles([]);
      setShowAdvanced(false);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [quickCaptureOpen, quickCaptureDefaults]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const MAX_SIZE = 5 * 1024 * 1024;
    const valid = selected.filter((f) => f.size <= MAX_SIZE);
    setFiles((prev) => [...prev, ...valid].slice(0, 3));
    e.target.value = '';
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const task = await createTask({
      title: title.trim(),
      notes: notes.trim() || undefined,
      priority,
      status,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      projectId: projectId || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      estimateMinutes: estimateMinutes ? parseInt(estimateMinutes) : undefined,
      recurrenceRule: recurrenceRule || undefined,
    });

    for (const file of files) {
      await attachmentsApi.upload(task.id, file);
    }

    setQuickCaptureOpen(false);
  }

  if (!quickCaptureOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setQuickCaptureOpen(false)}
      />

      {/* Modal */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in"
      >
        {/* Title input */}
        <div className="p-4 pb-2">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task name"
            className="w-full text-base font-medium bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600"
            autoComplete="off"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional, markdown supported)"
            rows={2}
            className="w-full mt-2 text-sm bg-transparent outline-none text-gray-600 dark:text-gray-400 placeholder-gray-300 dark:placeholder-gray-600 resize-none"
          />
        </div>

        {/* Inline controls */}
        <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-800">
          {/* Priority */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold transition-colors',
                  priority === p.value ? `bg-gray-100 dark:bg-gray-800 ${p.color}` : 'text-gray-400',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-gray-600 dark:text-gray-400 outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Due date */}
          <div className="flex items-center gap-1 text-xs">
            <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="text-xs bg-transparent outline-none text-gray-600 dark:text-gray-400"
            />
          </div>

          {/* Project */}
          {projects && projects.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <FolderOpen className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="text-xs bg-transparent outline-none text-gray-600 dark:text-gray-400"
              >
                <option value="">No project</option>
                {projects.filter((p) => !p.archived).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-auto"
          >
            {showAdvanced ? 'Less ↑' : 'More ↓'}
          </button>
        </div>

        {/* Advanced options */}
        {showAdvanced && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-gray-400" />
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma separated)"
                className="flex-1 text-xs bg-transparent outline-none text-gray-600 dark:text-gray-400 placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <input
                type="number"
                value={estimateMinutes}
                onChange={(e) => setEstimateMinutes(e.target.value)}
                placeholder="Estimate (minutes)"
                min={5}
                className="flex-1 text-xs bg-transparent outline-none text-gray-600 dark:text-gray-400 placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <Repeat className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={recurrenceRule}
                onChange={(e) => setRecurrenceRule(e.target.value)}
                className="flex-1 text-xs bg-transparent outline-none text-gray-600 dark:text-gray-400"
              >
                <option value="">No recurrence</option>
                {COMMON_RRULES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= 3}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-40"
              >
                <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                {files.length >= 3 ? 'Max 3 files' : 'Attach files (max 5 MB each)'}
              </button>
              {files.length > 0 && (
                <div className="space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                      <Paperclip className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-gray-400 flex-shrink-0">{formatSize(f.size)}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setQuickCaptureOpen(false)}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || isPending}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? 'Adding…' : 'Add task'}
          </button>
        </div>
      </form>
    </div>
  );
}
