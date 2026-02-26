'use client';

import { useState, useRef, useEffect } from 'react';
import { cn, PRIORITY_CONFIG } from '@/lib/utils';
import type { TaskPriority } from '@/types';

interface PriorityDropdownProps {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
}

export function PriorityDropdown({ value, onChange }: PriorityDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = PRIORITY_CONFIG[value];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={cn(
          'inline-block px-3 py-1 rounded-full text-xs font-medium text-center min-w-[70px] transition-opacity hover:opacity-80',
          current.bg, current.color,
        )}
      >
        {current.label}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-monday-border py-1 min-w-[140px] animate-fade-in">
          {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={(e) => { e.stopPropagation(); onChange(key as TaskPriority); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-monday-surface-secondary transition-colors text-left',
                key === value && 'bg-monday-surface-secondary',
              )}
            >
              <span className={cn('h-3 w-3 rounded-full', cfg.bg)} />
              <span className="text-monday-text">{cfg.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
