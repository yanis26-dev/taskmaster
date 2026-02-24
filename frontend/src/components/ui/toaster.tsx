'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple toast implementation without Radix dependency complexity
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toasts: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

function notify(listeners: ((toasts: Toast[]) => void)[], toasts: Toast[]) {
  listeners.forEach((l) => l([...toasts]));
}

export function toast(message: string, type: Toast['type'] = 'info') {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, message, type }];
  notify(listeners, toasts);
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify(listeners, toasts);
  }, 4000);
}

export function Toaster() {
  const [items, setItems] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    listeners.push(setItems);
    return () => { listeners = listeners.filter((l) => l !== setItems); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium min-w-[280px] animate-fade-in',
            item.type === 'success' && 'bg-green-600 text-white',
            item.type === 'error' && 'bg-red-600 text-white',
            item.type === 'info' && 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
          )}
        >
          <span className="flex-1">{item.message}</span>
          <button onClick={() => { toasts = toasts.filter((t) => t.id !== item.id); notify(listeners, toasts); }}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
