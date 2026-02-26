'use client';

import { Icon as IconifyIcon } from '@iconify/react';
import { cn } from '@/lib/utils';

interface IconProps {
  icon: string;
  className?: string;
}

export function Icon({ icon, className }: IconProps) {
  return <IconifyIcon icon={icon} className={cn('inline-block shrink-0', className)} />;
}
