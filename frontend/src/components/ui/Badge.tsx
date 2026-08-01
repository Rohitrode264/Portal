import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'indigo' | 'teal';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-zinc-100 text-zinc-600',
  blue:    'bg-blue-50 text-blue-700',
  green:   'bg-emerald-50 text-emerald-700',
  red:     'bg-red-50 text-red-600',
  amber:   'bg-amber-50 text-amber-700',
  purple:  'bg-purple-50 text-purple-700',
  indigo:  'bg-indigo-50 text-indigo-700',
  teal:    'bg-teal-50 text-teal-700',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-zinc-400',
  blue:    'bg-blue-500',
  green:   'bg-emerald-500',
  red:     'bg-red-500',
  amber:   'bg-amber-500',
  purple:  'bg-purple-500',
  indigo:  'bg-indigo-500',
  teal:    'bg-teal-500',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] gap-1',
  md: 'px-2.5 py-1 text-[12px] gap-1.5',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center font-semibold rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={[
            'shrink-0 rounded-full',
            size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
            dotColors[variant],
          ].join(' ')}
        />
      )}
      {children}
    </span>
  );
}
