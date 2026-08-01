import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center',
        'py-14 px-6 bg-white border border-gray-100 rounded-xl',
        className,
      ].join(' ')}
    >
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-3 text-gray-300">
        {icon}
      </div>
      <p className="text-[14px] font-semibold text-gray-700">{title}</p>
      {description && (
        <p className="text-[13px] text-gray-400 mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
