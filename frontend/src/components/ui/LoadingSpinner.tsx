import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({ size = 22, className = '', fullPage = false }: LoadingSpinnerProps) {
  const spinner = (
    <Loader2
      size={size}
      className={['animate-spin text-gray-400', className].join(' ')}
    />
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center py-20">
        {spinner}
      </div>
    );
  }

  return spinner;
}
