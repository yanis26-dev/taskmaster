'use client';

import { useState, useEffect, useRef } from 'react';
import { useTask, useUpdateTask, useTransitionTask, useDeleteTask, useProjects } from '@/hooks/useTasks';
import { useTaskStore } from '@/store/taskStore';
import { attachmentsApi } from '@/lib/api';
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, COMMON_RRULES, tagColor } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQueryClient } from '@tanstack/react-query';
import type { Task, TaskStatus, TaskPriority, Attachment } from '@/types';

export function TaskDetail() {
  const { selectedTaskId, setSelectedTaskId } = useTaskStore();
  const { data: task } = useTask(selectedTaskId ?? '');
  const { mutate: update } = useUpdateTask();
  const { mutate: transition } = useTransitionTask();
  const { mutate: deleteTask } = useDeleteTask();
  const { data: projects } = useProjects();

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  useEffect(() => {
    if (task) {
      setNotesValue(task.notes ?? '');
      setTitleValue(task.title);
    }
  }, [task]);

  if (!selectedTaskId) return null;

  function saveNotes() {
    if (!task) return;
    update({ id: task.id, input: { notes: notesValue } });
    setEditingNotes(false);
  }

  function saveTitle() {
    if (!task || !titleValue.trim()) return;
    update({ id: task.id, input: { title: titleValue.trim() } });
    setEditingTitle(false);
  }

  function handleDelete() {
    if (!task) return;
    if (!confirm('Delete this task?')) return;
    deleteTask(task.id);
    setSelectedTaskId(null);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedTaskId(null)} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl border-l border-monday-border flex flex-col animate-slide-in">
        {task ? (
          <TaskDetailContent
            task={task as any}
            projects={projects ?? []}
            editingTitle={editingTitle}
            titleValue={titleValue}
            editingNotes={editingNotes}
            notesValue={notesValue}
            onClose={() => setSelectedTaskId(null)}
            onDelete={handleDelete}
            onTitleClick={() => setEditingTitle(true)}
            onTitleChange={(v) => setTitleValue(v)}
            onTitleSave={saveTitle}
            onTitleBlur={saveTitle}
            onNotesClick={() => setEditingNotes(true)}
            onNotesChange={(v) => setNotesValue(v)}
            onNotesSave={saveNotes}
            onUpdate={(input) => update({ id: task.id, input })}
            onTransition={(status) => transition({ id: task.id, status })}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-monday-primary" />
          </div>
        )}
      </aside>
    </>
  );
}

function TaskDetailContent({
  task, projects, editingTitle, titleValue, editingNotes, notesValue,
  onClose, onDelete, onTitleClick, onTitleChange, onTitleSave, onTitleBlur,
  onNotesClick, onNotesChange, onNotesSave, onUpdate, onTransition,
}: {
  task: Task & { activityLogs?: any[] };
  projects: import('@/types').Project[];
  editingTitle: boolean; titleValue: string;
  editingNotes: boolean; notesValue: string;
  onClose: () => void; onDelete: () => void;
  onTitleClick: () => void; onTitleChange: (v: string) => void; onTitleSave: () => void; onTitleBlur: () => void;
  onNotesClick: () => void; onNotesChange: (v: string) => void; onNotesSave: () => void;
  onUpdate: (input: any) => void; onTransition: (status: TaskStatus) => void;
}) {
  const isDone = task.status === 'done';

  return (
    <>
      <div className="flex items-start gap-3 p-4 border-b border-monday-border-light">
        <button
          onClick={() => onTransition(isDone ? 'next' : 'done')}
          className={cn(
            'flex-shrink-0 mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
            isDone ? 'bg-monday-status-done border-monday-status-done' : 'border-monday-text-tertiary hover:border-monday-primary',
          )}
        >
          {isDone && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input autoFocus value={titleValue} onChange={(e) => onTitleChange(e.target.value)} onBlur={onTitleBlur} onKeyDown={(e) => e.key === 'Enter' && onTitleSave()} className="w-full text-base font-medium bg-transparent outline-none text-monday-text" />
          ) : (
            <h2 onClick={onTitleClick} className={cn('text-base font-medium cursor-text text-monday-text', isDone && 'line-through text-monday-text-tertiary')}>{task.title}</h2>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onDelete} className="p-1.5 rounded-md text-monday-text-tertiary hover:text-[#e2445c] hover:bg-[#e2445c]/10 transition-colors">
            <Icon icon="solar:trash-bin-trash-bold" className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md text-monday-text-tertiary hover:text-monday-text hover:bg-monday-surface-secondary transition-colors">
            <Icon icon="solar:close-circle-bold" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select value={task.status} onChange={(e) => onTransition(e.target.value as TaskStatus)} className="w-full text-sm bg-transparent outline-none text-monday-text">
              {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (<option key={v} value={v}>{label}</option>))}
            </select>
          </Field>
          <Field label="Priority">
            <select value={task.priority} onChange={(e) => onUpdate({ priority: e.target.value as TaskPriority })} className="w-full text-sm bg-transparent outline-none text-monday-text">
              {Object.entries(PRIORITY_CONFIG).map(([v, { label }]) => (<option key={v} value={v}>{label}</option>))}
            </select>
          </Field>
          <Field label="Due date" icon={<Icon icon="solar:calendar-bold" className="h-3.5 w-3.5" />}>
            <input type="datetime-local" value={task.dueAt ? task.dueAt.slice(0, 16) : ''} onChange={(e) => onUpdate({ dueAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="w-full text-sm bg-transparent outline-none text-monday-text" />
          </Field>
          <Field label="Estimate" icon={<Icon icon="solar:clock-circle-bold" className="h-3.5 w-3.5" />}>
            <input type="number" value={task.estimateMinutes ?? ''} onChange={(e) => onUpdate({ estimateMinutes: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="Minutes" min={5} className="w-full text-sm bg-transparent outline-none text-monday-text" />
          </Field>
          <Field label="Project" icon={<Icon icon="solar:folder-open-bold" className="h-3.5 w-3.5" />}>
            <select value={task.projectId ?? ''} onChange={(e) => onUpdate({ projectId: e.target.value || undefined })} className="w-full text-sm bg-transparent outline-none text-monday-text">
              <option value="">No project</option>
              {projects.filter((p) => !p.archived).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </Field>
          <Field label="Recurrence" icon={<Icon icon="solar:restart-bold" className="h-3.5 w-3.5" />}>
            <select value={task.recurrenceRule ?? ''} onChange={(e) => onUpdate({ recurrenceRule: e.target.value || undefined })} className="w-full text-sm bg-transparent outline-none text-monday-text">
              <option value="">None</option>
              {COMMON_RRULES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
            </select>
          </Field>
        </div>

        <Field label="Tags" icon={<Icon icon="solar:tag-bold" className="h-3.5 w-3.5" />}>
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag) => (<span key={tag} className={cn('px-2 py-0.5 rounded-full text-xs font-medium', tagColor(tag))}>{tag}</span>))}
          </div>
        </Field>

        {task.externalUrl && (
          <div className="flex items-center gap-2 text-sm">
            <a href={task.externalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-monday-primary hover:underline">
              <Icon icon="solar:square-arrow-right-up-bold" className="h-3.5 w-3.5" />
              {task.source === 'outlook_email' ? 'Open in Outlook Mail' : 'Open in Outlook Calendar'}
            </a>
            {task.externalMissing && <span className="text-xs text-monday-status-working">(deleted in Outlook)</span>}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-monday-text-tertiary uppercase tracking-wider">Notes</label>
          <div className="mt-1">
            {editingNotes ? (
              <div>
                <textarea autoFocus value={notesValue} onChange={(e) => onNotesChange(e.target.value)} rows={8} className="w-full text-sm bg-monday-surface-secondary rounded-lg p-3 outline-none border border-monday-border text-monday-text resize-none font-mono" placeholder="Markdown supported..." />
                <div className="flex gap-2 mt-2">
                  <button onClick={onNotesSave} className="px-3 py-1 text-xs bg-monday-primary text-white rounded-md hover:bg-monday-primary-hover transition-colors">Save</button>
                  <button onClick={() => onNotesChange(task.notes ?? '')} className="px-3 py-1 text-xs text-monday-text-tertiary hover:text-monday-text transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div onClick={onNotesClick} className={cn('min-h-[80px] text-sm rounded-lg p-3 cursor-text hover:bg-monday-surface-secondary transition-colors', !task.notes && 'text-monday-text-tertiary')}>
                {task.notes ? (<ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">{task.notes}</ReactMarkdown>) : 'Add notes...'}
              </div>
            )}
          </div>
        </div>

        <AttachmentsSection task={task} />

        {(task as any).activityLogs?.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-monday-text-tertiary uppercase tracking-wider">Activity</label>
            <div className="mt-2 space-y-2">
              {(task as any).activityLogs.slice(0, 10).map((log: any) => (
                <div key={log.id} className="flex items-start gap-2 text-xs text-monday-text-tertiary">
                  <span className="flex-shrink-0">{format(new Date(log.createdAt), 'MMM d, HH:mm')}</span>
                  <span>{log.action.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-monday-text-tertiary pt-4 border-t border-monday-border-light space-y-1">
          <p>Created {format(new Date(task.createdAt), 'MMM d, yyyy HH:mm')}</p>
          <p>Updated {format(new Date(task.updatedAt), 'MMM d, yyyy HH:mm')}</p>
          {task.source !== 'manual' && <p>Source: {task.source}</p>}
        </div>
      </div>
    </>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentsSection({ task }: { task: Task }) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const attachments = task.attachments ?? [];

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File must be under 5 MB'); return; }
    setUploading(true);
    try { await attachmentsApi.upload(task.id, file); qc.invalidateQueries({ queryKey: ['task', task.id] }); }
    catch (err: any) { alert(err.message ?? 'Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  }

  async function handleDelete(att: Attachment) {
    await attachmentsApi.delete(task.id, att.id);
    qc.invalidateQueries({ queryKey: ['task', task.id] });
  }

  return (
    <div>
      <label className="text-xs font-semibold text-monday-text-tertiary uppercase tracking-wider">Attachments</label>
      <div className="mt-2 space-y-2">
        {attachments.map((att) => (
          <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg border border-monday-border-light">
            <Icon icon="solar:paperclip-bold" className="h-3.5 w-3.5 text-monday-text-tertiary flex-shrink-0" />
            <a href={attachmentsApi.downloadUrl(task.id, att.id)} className="flex-1 text-sm text-monday-primary hover:underline truncate">{att.filename}</a>
            <span className="text-xs text-monday-text-tertiary flex-shrink-0">{formatFileSize(att.size)}</span>
            <a href={attachmentsApi.downloadUrl(task.id, att.id)} className="p-1 text-monday-text-tertiary hover:text-monday-text transition-colors" title="Download">
              <Icon icon="solar:download-bold" className="h-3.5 w-3.5" />
            </a>
            <button onClick={() => handleDelete(att)} className="p-1 text-monday-text-tertiary hover:text-[#e2445c] transition-colors" title="Delete">
              <Icon icon="solar:close-circle-bold" className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading || attachments.length >= 3} className="flex items-center gap-1.5 text-xs text-monday-text-secondary hover:text-monday-primary disabled:opacity-40 transition-colors">
          <Icon icon="solar:add-circle-bold" className="h-3.5 w-3.5" />
          {uploading ? 'Uploading...' : attachments.length >= 3 ? 'Max 3 files' : 'Add file'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-xs text-monday-text-tertiary">{icon}{label}</label>
      <div className="text-sm text-monday-text">{children}</div>
    </div>
  );
}
