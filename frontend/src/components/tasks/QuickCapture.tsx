'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { useCreateTask, useProjects } from '@/hooks/useTasks';
import { attachmentsApi } from '@/lib/api';
import { cn, COMMON_RRULES, PRIORITY_CONFIG } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import type { TaskPriority, TaskStatus } from '@/types';

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'P0', label: 'Critical' },
  { value: 'P1', label: 'High' },
  { value: 'P2', label: 'Medium' },
  { value: 'P3', label: 'Low' },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Not Started' },
  { value: 'next', label: 'Next Up' },
  { value: 'in_progress', label: 'Working on it' },
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

  useEffect(() => {
    if (quickCaptureOpen) {
      setTitle(''); setNotes('');
      setPriority((quickCaptureDefaults.priority as TaskPriority) ?? 'P2');
      setStatus((quickCaptureDefaults.status as TaskStatus) ?? 'backlog');
      setDueAt(quickCaptureDefaults.dueAt?.slice(0, 10) ?? '');
      setProjectId(quickCaptureDefaults.projectId ?? '');
      setTags((quickCaptureDefaults.tags ?? []).join(', '));
      setEstimateMinutes(String(quickCaptureDefaults.estimateMinutes ?? ''));
      setRecurrenceRule(''); setFiles([]); setShowAdvanced(false);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [quickCaptureOpen, quickCaptureDefaults]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const valid = selected.filter((f) => f.size <= 5 * 1024 * 1024);
    setFiles((prev) => [...prev, ...valid].slice(0, 3));
    e.target.value = '';
  }

  function removeFile(index: number) { setFiles((prev) => prev.filter((_, i) => i !== index)); }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const task = await createTask({
      title: title.trim(), notes: notes.trim() || undefined, priority, status,
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      projectId: projectId || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      estimateMinutes: estimateMinutes ? parseInt(estimateMinutes) : undefined,
      recurrenceRule: recurrenceRule || undefined,
    });
    for (const file of files) { await attachmentsApi.upload(task.id, file); }
    setQuickCaptureOpen(false);
  }

  if (!quickCaptureOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setQuickCaptureOpen(false)} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-monday-border overflow-hidden animate-fade-in">
        <div className="p-4 pb-2">
          <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task name" className="w-full text-base font-medium bg-transparent outline-none text-monday-text placeholder-monday-text-tertiary" autoComplete="off" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional, markdown supported)" rows={2} className="w-full mt-2 text-sm bg-transparent outline-none text-monday-text-secondary placeholder-monday-text-tertiary resize-none" />
        </div>

        <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-monday-border-light">
          <div className="flex rounded-lg overflow-hidden border border-monday-border">
            {PRIORITIES.map((p) => {
              const cfg = PRIORITY_CONFIG[p.value];
              return (
                <button key={p.value} type="button" onClick={() => setPriority(p.value)} className={cn('px-2.5 py-1 text-xs font-medium transition-colors', priority === p.value ? `${cfg.bg} ${cfg.color}` : 'text-monday-text-tertiary hover:bg-monday-surface-secondary')}>
                  {p.label}
                </button>
              );
            })}
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="text-xs px-2 py-1 rounded-lg border border-monday-border bg-transparent text-monday-text-secondary outline-none">
            {STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </select>
          <div className="flex items-center gap-1 text-xs">
            <Icon icon="solar:calendar-bold" className="h-3.5 w-3.5 text-monday-text-tertiary" />
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="text-xs bg-transparent outline-none text-monday-text-secondary" />
          </div>
          {projects && projects.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Icon icon="solar:folder-open-bold" className="h-3.5 w-3.5 text-monday-text-tertiary" />
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="text-xs bg-transparent outline-none text-monday-text-secondary">
                <option value="">No project</option>
                {projects.filter((p) => !p.archived).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
          )}
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-monday-text-tertiary hover:text-monday-primary ml-auto">
            {showAdvanced ? 'Less' : 'More'}
          </button>
        </div>

        {showAdvanced && (
          <div className="px-4 py-3 border-t border-monday-border-light space-y-3">
            <div className="flex items-center gap-2">
              <Icon icon="solar:tag-bold" className="h-3.5 w-3.5 text-monday-text-tertiary" />
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" className="flex-1 text-xs bg-transparent outline-none text-monday-text-secondary placeholder-monday-text-tertiary" />
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="solar:clock-circle-bold" className="h-3.5 w-3.5 text-monday-text-tertiary" />
              <input type="number" value={estimateMinutes} onChange={(e) => setEstimateMinutes(e.target.value)} placeholder="Estimate (minutes)" min={5} className="flex-1 text-xs bg-transparent outline-none text-monday-text-secondary placeholder-monday-text-tertiary" />
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="solar:restart-bold" className="h-3.5 w-3.5 text-monday-text-tertiary" />
              <select value={recurrenceRule} onChange={(e) => setRecurrenceRule(e.target.value)} className="flex-1 text-xs bg-transparent outline-none text-monday-text-secondary">
                <option value="">No recurrence</option>
                {COMMON_RRULES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={files.length >= 3} className="flex items-center gap-2 text-xs text-monday-text-secondary hover:text-monday-primary disabled:opacity-40">
                <Icon icon="solar:paperclip-bold" className="h-3.5 w-3.5 text-monday-text-tertiary" />
                {files.length >= 3 ? 'Max 3 files' : 'Attach files (max 5 MB each)'}
              </button>
              {files.length > 0 && (
                <div className="space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-monday-text-secondary">
                      <Icon icon="solar:paperclip-bold" className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-monday-text-tertiary flex-shrink-0">{formatSize(f.size)}</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-monday-text-tertiary hover:text-[#e2445c]">
                        <Icon icon="solar:close-circle-bold" className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-4 py-3 bg-monday-surface-secondary flex items-center justify-between border-t border-monday-border-light">
          <button type="button" onClick={() => setQuickCaptureOpen(false)} className="text-sm text-monday-text-tertiary hover:text-monday-text flex items-center gap-1">
            <Icon icon="solar:close-circle-bold" className="h-3.5 w-3.5" /> Cancel
          </button>
          <button type="submit" disabled={!title.trim() || isPending} className="px-4 py-1.5 bg-monday-primary hover:bg-monday-primary-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {isPending ? 'Adding...' : 'Add task'}
          </button>
        </div>
      </form>
    </div>
  );
}
