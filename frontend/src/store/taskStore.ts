'use client';

import { create } from 'zustand';
import type { Task, User } from '@/types';

interface TaskStore {
  // Selected task for detail drawer
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;

  // Quick capture
  quickCaptureOpen: boolean;
  setQuickCaptureOpen: (open: boolean) => void;
  quickCaptureDefaults: Partial<Task>;
  setQuickCaptureDefaults: (defaults: Partial<Task>) => void;

  // Search
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  // View mode
  viewMode: 'table' | 'kanban' | 'timeline';
  setViewMode: (mode: 'table' | 'kanban' | 'timeline') => void;

  // Current user
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  quickCaptureOpen: false,
  setQuickCaptureOpen: (open) => set({ quickCaptureOpen: open }),
  quickCaptureDefaults: {},
  setQuickCaptureDefaults: (defaults) => set({ quickCaptureDefaults: defaults }),

  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),

  viewMode: 'table',
  setViewMode: (mode) => set({ viewMode: mode }),

  user: null,
  setUser: (user) => set({ user }),
}));
