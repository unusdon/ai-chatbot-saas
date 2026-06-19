import * as React from 'react';

import { cn } from '@/lib/utils';

export function Progress({
  value,
  variant = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value: number;
  variant?: 'default' | 'warning' | 'destructive';
}) {
  const colors = {
    default: 'bg-primary',
    warning: 'bg-amber-500',
    destructive: 'bg-destructive',
  };
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        className={cn('h-full transition-all', colors[variant])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
