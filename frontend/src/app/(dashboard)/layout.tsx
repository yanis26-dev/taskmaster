'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useTaskStore } from '@/store/taskStore';
import { useKeyboard } from '@/hooks/useKeyboard';
import { Sidebar } from '@/components/layout/Sidebar';
import { QuickCapture } from '@/components/tasks/QuickCapture';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { CommandSearch } from '@/components/layout/CommandSearch';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser } = useTaskStore();

  // Load current user
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    retry: false,
  });

  useEffect(() => {
    if (isError) router.push('/login');
  }, [isError, router]);

  useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  // Global keyboard shortcuts
  useKeyboard();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar user={user} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>

      {/* Overlays */}
      <QuickCapture />
      <TaskDetail />
      <CommandSearch />
    </div>
  );
}
