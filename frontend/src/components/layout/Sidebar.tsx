'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/useTasks';
import { useTaskStore } from '@/store/taskStore';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  shortcut?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/today', label: 'Today', icon: 'solar:calendar-bold', shortcut: 'T' },
  { href: '/inbox', label: 'Inbox', icon: 'solar:list-bold', shortcut: 'I' },
  { href: '/upcoming', label: 'Upcoming', icon: 'solar:calendar-line-duotone', shortcut: 'U' },
  { href: '/backlog', label: 'Backlog', icon: 'solar:archive-bold', shortcut: 'B' },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: projects } = useProjects();
  const { setQuickCaptureOpen } = useTaskStore();
  const [projectsOpen, setProjectsOpen] = useState(true);

  async function handleLogout() {
    await authApi.logout();
    router.push('/login');
  }

  return (
    <aside className="w-60 flex-shrink-0 border-r border-monday-border bg-white flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-monday-primary flex items-center justify-center">
          <Icon icon="solar:checkbox-bold" className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-monday-text text-lg">TaskMaster</span>
      </div>

      {/* Quick Add */}
      <div className="px-3 pb-4">
        <button
          onClick={() => setQuickCaptureOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-monday-primary hover:bg-monday-primary-hover text-white text-sm font-medium transition-colors"
        >
          <Icon icon="solar:add-circle-bold" className="h-4 w-4" />
          New task
          <kbd className="ml-auto text-xs opacity-70 font-mono">N</kbd>
        </button>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={pathname === item.href} />
        ))}

        {/* Projects section */}
        <div className="pt-5 pb-1 px-2">
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="flex items-center justify-between w-full group"
          >
            <span className="text-xs font-semibold text-monday-text-tertiary uppercase tracking-wider">Projects</span>
            <div className="flex items-center gap-1">
              <Link
                href="/projects"
                onClick={(e) => e.stopPropagation()}
                className="text-monday-text-tertiary hover:text-monday-primary opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Icon icon="solar:add-circle-bold" className="h-3.5 w-3.5" />
              </Link>
              <Icon
                icon={projectsOpen ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-right-bold'}
                className="h-3 w-3 text-monday-text-tertiary"
              />
            </div>
          </button>
        </div>

        {projectsOpen && projects?.filter(p => !p.archived).map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className={cn(
              'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
              pathname === `/projects/${project.id}`
                ? 'bg-monday-primary-selected text-monday-primary font-medium'
                : 'text-monday-text-secondary hover:bg-monday-surface-secondary hover:text-monday-text',
            )}
          >
            <span
              className="h-2.5 w-2.5 rounded flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <span className="truncate">{project.name}</span>
            {project._count?.tasks ? (
              <span className="ml-auto text-xs text-monday-text-tertiary">{project._count.tasks}</span>
            ) : null}
          </Link>
        ))}

        {/* Tags */}
        <div className="pt-4 pb-1">
          <NavLink
            item={{ href: '/tags', label: 'Tags', icon: 'solar:tag-bold' }}
            active={pathname === '/tags'}
          />
        </div>
      </nav>

      {/* Bottom: user + settings */}
      <div className="p-3 border-t border-monday-border">
        {user.role === 'admin' && (
          <NavLink
            item={{ href: '/admin', label: 'Admin', icon: 'solar:shield-bold' }}
            active={pathname === '/admin'}
          />
        )}
        <NavLink
          item={{ href: '/settings', label: 'Settings', icon: 'solar:settings-bold' }}
          active={pathname === '/settings'}
        />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm text-monday-text-secondary hover:text-monday-text hover:bg-monday-surface-secondary mt-1 transition-colors"
        >
          <Icon icon="solar:logout-2-bold" className="h-4 w-4" />
          Sign out
        </button>

        <div className="mt-3 flex items-center gap-2.5 px-2 py-1.5">
          <div className="h-7 w-7 rounded-full bg-monday-primary-selected flex items-center justify-center text-monday-primary text-xs font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-monday-text truncate">{user.name}</p>
            <p className="text-xs text-monday-text-tertiary truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors group',
        active
          ? 'bg-monday-primary-selected text-monday-primary font-medium border-l-[3px] border-monday-primary -ml-px'
          : 'text-monday-text-secondary hover:bg-monday-surface-secondary hover:text-monday-text',
      )}
    >
      <Icon icon={item.icon} className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.shortcut && (
        <kbd className="hidden group-hover:inline text-xs text-monday-text-tertiary font-mono">
          {item.shortcut}
        </kbd>
      )}
    </Link>
  );
}
