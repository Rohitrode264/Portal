import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-zinc-600 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 flex items-center pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              'form-input',
              icon ? 'pl-9' : '',
              error ? 'error' : '',
              className,
            ].join(' ')}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[12px] text-red-500 font-medium flex items-center gap-1">
            {error}
          </p>
        )}
        {!error && hint && (
          <p className="text-[12px] text-zinc-400">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
