'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare, Calendar, List, Archive, Tag, Settings,
  Plus, LogOut, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/useTasks';
import { useTaskStore } from '@/store/taskStore';
import { authApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/today', label: 'Today', icon: Calendar, shortcut: 'T' },
  { href: '/inbox', label: 'Inbox', icon: List, shortcut: 'I' },
  { href: '/upcoming', label: 'Upcoming', icon: Calendar, shortcut: 'U' },
  { href: '/backlog', label: 'Backlog', icon: Archive, shortcut: 'B' },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: projects } = useProjects();
  const { setQuickCaptureOpen } = useTaskStore();

  async function handleLogout() {
    await authApi.logout();
    router.push('/login');
  }

  return (
    <aside className="w-60 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-2">
        <CheckSquare className="h-6 w-6 text-indigo-600" />
        <span className="font-bold text-gray-900 dark:text-white text-lg">TaskMaster</span>
      </div>

      {/* Quick Add */}
      <div className="px-3 pb-4">
        <button
          onClick={() => setQuickCaptureOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
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
        <div className="pt-4 pb-1 px-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projects</span>
            <Link
              href="/projects"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Plus className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {projects?.filter(p => !p.archived).map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className={cn(
              'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
              pathname === `/projects/${project.id}`
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
            )}
          >
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <span className="truncate">{project.name}</span>
            {project._count?.tasks ? (
              <span className="ml-auto text-xs text-gray-400">{project._count.tasks}</span>
            ) : null}
          </Link>
        ))}

        {/* Tags */}
        <div className="pt-4 pb-1">
          <NavLink
            item={{ href: '/tags', label: 'Tags', icon: Tag }}
            active={pathname === '/tags'}
          />
        </div>
      </nav>

      {/* Bottom: user + settings */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        {user.role === 'admin' && (
          <NavLink
            item={{ href: '/admin', label: 'Admin', icon: Shield }}
            active={pathname === '/admin'}
          />
        )}
        <NavLink
          item={{ href: '/settings', label: 'Settings', icon: Settings }}
          active={pathname === '/settings'}
        />
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 mt-1 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>

        <div className="mt-3 flex items-center gap-2 px-2 py-1.5">
          <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors group',
        active
          ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white',
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.shortcut && (
        <kbd className="hidden group-hover:inline text-xs text-gray-300 dark:text-gray-600 font-mono">
          {item.shortcut}
        </kbd>
      )}
    </Link>
  );
}
