'use client';

import { useState, useEffect } from 'react';
import { useTask, useUpdateTask, useTransitionTask, useDeleteTask, useProjects } from '@/hooks/useTasks';
import { useTaskStore } from '@/store/taskStore';
import { cn, formatDueDate, PRIORITY_CONFIG, STATUS_CONFIG, COMMON_RRULES, tagColor } from '@/lib/utils';
import { X, Trash2, ExternalLink, Repeat, Calendar, Clock, Tag, FolderOpen, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Task, TaskStatus, TaskPriority } from '@/types';

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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={() => setSelectedTaskId(null)}
      />

      {/* Drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col animate-slide-in">
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
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
  editingTitle: boolean;
  titleValue: string;
  editingNotes: boolean;
  notesValue: string;
  onClose: () => void;
  onDelete: () => void;
  onTitleClick: () => void;
  onTitleChange: (v: string) => void;
  onTitleSave: () => void;
  onTitleBlur: () => void;
  onNotesClick: () => void;
  onNotesChange: (v: string) => void;
  onNotesSave: () => void;
  onUpdate: (input: any) => void;
  onTransition: (status: TaskStatus) => void;
}) {
  const isDone = task.status === 'done';
  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => onTransition(isDone ? 'next' : 'done')}
          className={cn(
            'flex-shrink-0 mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
            isDone
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 hover:border-indigo-500',
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
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={onTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && onTitleSave()}
              className="w-full text-base font-medium bg-transparent outline-none text-gray-900 dark:text-white"
            />
          ) : (
            <h2
              onClick={onTitleClick}
              className={cn(
                'text-base font-medium cursor-text text-gray-900 dark:text-white',
                isDone && 'line-through text-gray-400',
              )}
            >
              {task.title}
            </h2>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onDelete} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Fields */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select
              value={task.status}
              onChange={(e) => onTransition(e.target.value as TaskStatus)}
              className="w-full text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300"
            >
              {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </Field>

          <Field label="Priority">
            <select
              value={task.priority}
              onChange={(e) => onUpdate({ priority: e.target.value as TaskPriority })}
              className="w-full text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300"
            >
              {Object.entries(PRIORITY_CONFIG).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </Field>

          <Field label="Due date" icon={<Calendar className="h-3.5 w-3.5" />}>
            <input
              type="datetime-local"
              value={task.dueAt ? task.dueAt.slice(0, 16) : ''}
              onChange={(e) => onUpdate({ dueAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              className="w-full text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300"
            />
          </Field>

          <Field label="Estimate" icon={<Clock className="h-3.5 w-3.5" />}>
            <input
              type="number"
              value={task.estimateMinutes ?? ''}
              onChange={(e) => onUpdate({ estimateMinutes: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="Minutes"
              min={5}
              className="w-full text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300"
            />
          </Field>

          <Field label="Project" icon={<FolderOpen className="h-3.5 w-3.5" />}>
            <select
              value={task.projectId ?? ''}
              onChange={(e) => onUpdate({ projectId: e.target.value || undefined })}
              className="w-full text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300"
            >
              <option value="">No project</option>
              {projects.filter((p) => !p.archived).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Recurrence" icon={<Repeat className="h-3.5 w-3.5" />}>
            <select
              value={task.recurrenceRule ?? ''}
              onChange={(e) => onUpdate({ recurrenceRule: e.target.value || undefined })}
              className="w-full text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300"
            >
              <option value="">None</option>
              {COMMON_RRULES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Tags */}
        <Field label="Tags" icon={<Tag className="h-3.5 w-3.5" />}>
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <span key={tag} className={cn('px-2 py-0.5 rounded-full text-xs', tagColor(tag))}>
                {tag}
              </span>
            ))}
          </div>
        </Field>

        {/* External link */}
        {task.externalUrl && (
          <div className="flex items-center gap-2 text-sm">
            <a
              href={task.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {task.source === 'outlook_email' ? 'Open in Outlook Mail' : 'Open in Outlook Calendar'}
            </a>
            {task.externalMissing && (
              <span className="text-xs text-orange-500">(deleted in Outlook)</span>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</label>
          <div className="mt-1">
            {editingNotes ? (
              <div>
                <textarea
                  autoFocus
                  value={notesValue}
                  onChange={(e) => onNotesChange(e.target.value)}
                  rows={8}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3 outline-none border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 resize-none font-mono"
                  placeholder="Markdown supported..."
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={onNotesSave}
                    className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { onNotesChange(task.notes ?? ''); }}
                    className="px-3 py-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={onNotesClick}
                className={cn(
                  'min-h-[80px] text-sm rounded-lg p-3 cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                  !task.notes && 'text-gray-300 dark:text-gray-600',
                )}
              >
                {task.notes ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm dark:prose-invert max-w-none">
                    {task.notes}
                  </ReactMarkdown>
                ) : (
                  'Add notes...'
                )}
              </div>
            )}
          </div>
        </div>

        {/* Activity log */}
        {(task as any).activityLogs?.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Activity</label>
            <div className="mt-2 space-y-2">
              {(task as any).activityLogs.slice(0, 10).map((log: any) => (
                <div key={log.id} className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">
                    {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                  </span>
                  <span>{log.action.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-gray-300 dark:text-gray-600 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
          <p>Created {format(new Date(task.createdAt), 'MMM d, yyyy HH:mm')}</p>
          <p>Updated {format(new Date(task.updatedAt), 'MMM d, yyyy HH:mm')}</p>
          {task.source !== 'manual' && <p>Source: {task.source}</p>}
        </div>
      </div>
    </>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-xs text-gray-400">
        {icon}
        {label}
      </label>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {children}
      </div>
    </div>
  );
}
