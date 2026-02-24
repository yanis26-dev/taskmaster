'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTaskStore } from '@/store/taskStore';

/**
 * Global keyboard shortcuts:
 * n → new task (open quick capture)
 * / → search
 * t → navigate to Today
 * i → navigate to Inbox (all tasks)
 * p → navigate to Projects
 * b → navigate to Backlog
 * u → navigate to Upcoming
 * Escape → close drawers
 */
export function useKeyboard() {
  const router = useRouter();
  const { setQuickCaptureOpen, setSearchOpen, selectedTaskId, setSelectedTaskId } = useTaskStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs / textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // Ignore modifier combos (except plain keys)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'n':
          e.preventDefault();
          setQuickCaptureOpen(true);
          break;
        case '/':
          e.preventDefault();
          setSearchOpen(true);
          break;
        case 't':
          router.push('/today');
          break;
        case 'i':
          router.push('/inbox');
          break;
        case 'p':
          router.push('/projects');
          break;
        case 'b':
          router.push('/backlog');
          break;
        case 'u':
          router.push('/upcoming');
          break;
        case 'Escape':
          if (selectedTaskId) setSelectedTaskId(null);
          setQuickCaptureOpen(false);
          setSearchOpen(false);
          break;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, setQuickCaptureOpen, setSearchOpen, selectedTaskId, setSelectedTaskId]);
}
