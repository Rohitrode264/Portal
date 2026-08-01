import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

export function FormField({ label, children, error, hint, required, className = '' }: FormFieldProps) {
  return (
    <div className={['flex flex-col gap-1.5', className].join(' ')}>
      <label className="text-[13px] font-medium text-zinc-600 select-none">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[12px] text-red-500 font-medium">{error}</p>
      )}
      {!error && hint && (
        <p className="text-[12px] text-zinc-400">{hint}</p>
      )}
    </div>
  );
}
