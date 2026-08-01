import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, className = '' }: PageHeaderProps) {
  return (
    <div className={['flex items-start justify-between gap-4', className].join(' ')}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight leading-none">
          {title}
        </h1>
        {description && (
          <p className="text-[13px] text-gray-500 mt-1.5 leading-snug">{description}</p>
        )}
      </div>
      {action && (
        <div className="shrink-0 flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
