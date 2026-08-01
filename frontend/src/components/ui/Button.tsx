import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'blue';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// Colors defined in Tailwind classes (works in light) — css-var overrides handled via inline style for dark mode
const variantStyles: Record<ButtonVariant, string> = {
  primary:   'bg-zinc-900 text-white hover:bg-black border border-transparent shadow-sm',
  secondary: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 border border-transparent',
  outline:   'bg-transparent text-zinc-700 hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300',
  ghost:     'bg-transparent text-zinc-600 hover:bg-zinc-100 border border-transparent',
  danger:    'bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm',
  success:   'bg-emerald-600 text-white hover:bg-emerald-700 border border-transparent shadow-sm',
  blue:      'bg-indigo-600 text-white hover:bg-indigo-700 border border-transparent shadow-sm',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-[13px] gap-2 rounded-xl',
  lg: 'h-10 px-5 text-sm gap-2 rounded-xl',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  // Remap primary to use CSS var so dark mode inverts
  const inlineStyle =
    variant === 'primary'
      ? { background: 'var(--primary)', color: 'var(--primary-text)', borderColor: 'transparent', ...style }
      : variant === 'outline'
        ? { background: 'var(--surface)', color: 'var(--text-sub)', borderColor: 'var(--border)', ...style }
        : style;

  return (
    <button
      disabled={isDisabled}
      style={inlineStyle}
      className={[
        'relative inline-flex items-center justify-center font-semibold',
        'transition-all duration-150 active:scale-[0.97]',
        'select-none whitespace-nowrap',
        variant !== 'primary' && variant !== 'outline' ? variantStyles[variant] : '',
        sizeStyles[size],
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
        className,
      ].join(' ')}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin shrink-0" size={14} />
      ) : leftIcon ? (
        <span className="shrink-0 flex items-center">{leftIcon}</span>
      ) : null}
      {children}
      {!isLoading && rightIcon && (
        <span className="shrink-0 flex items-center">{rightIcon}</span>
      )}
    </button>
  );
}
