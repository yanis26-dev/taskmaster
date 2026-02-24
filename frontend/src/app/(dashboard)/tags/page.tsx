'use client';

import { useState } from 'react';
import { useTasksQuery } from '@/hooks/useTasks';
import { TaskList } from '@/components/tasks/TaskList';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tag } from 'lucide-react';
import { cn, tagColor } from '@/lib/utils';

export default function TagsPage() {
  const { data: allTasks } = useTasksQuery();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Collect unique tags and their counts
  const tagCounts = (allTasks ?? []).reduce<Record<string, number>>((acc, task) => {
    task.tags.forEach((tag) => { acc[tag] = (acc[tag] ?? 0) + 1; });
    return acc;
  }, {});

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1]);

  const filteredTasks = selectedTag
    ? (allTasks ?? []).filter((t) => t.tags.includes(selectedTag))
    : [];

  return (
    <div>
      <PageHeader
        icon={<Tag className="h-5 w-5" />}
        title="Tags"
        subtitle="Tasks organized by tag"
      />

      {/* Tag cloud */}
      <div className="flex flex-wrap gap-2 mb-8">
        {sortedTags.map(([tag, count]) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all',
              selectedTag === tag
                ? `${tagColor(tag)} ring-2 ring-offset-1 ring-current scale-105`
                : tagColor(tag),
            )}
          >
            {tag}
            <span className="text-xs opacity-60">{count}</span>
          </button>
        ))}

        {sortedTags.length === 0 && (
          <p className="text-sm text-gray-400">No tags yet. Add tags to tasks to see them here.</p>
        )}
      </div>

      {/* Tasks for selected tag */}
      {selectedTag && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
            <span className={cn('px-2 py-0.5 rounded-full text-xs', tagColor(selectedTag))}>{selectedTag}</span>
            <span>({filteredTasks.length} tasks)</span>
          </h2>
          <TaskList tasks={filteredTasks} />
        </div>
      )}
    </div>
  );
}
