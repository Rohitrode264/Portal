import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className = '', id, children, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[13px] font-medium text-zinc-600 select-none">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            'form-select',
            error ? 'border-red-400 focus:border-red-500' : '',
            className,
          ].join(' ')}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-[12px] text-red-500 font-medium">{error}</p>}
        {!error && hint && <p className="text-[12px] text-zinc-400">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
