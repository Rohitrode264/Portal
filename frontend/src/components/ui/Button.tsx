import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled, 
  ...props 
}: ButtonProps) {
  const baseStyles = "relative w-full flex items-center justify-center py-3.5 px-6 rounded-xl font-bold transition-all duration-200 overflow-hidden";
  
  const variants = {
    primary: "bg-black hover:bg-gray-900 text-white shadow-sm hover:shadow active:scale-[0.98]",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 active:scale-[0.98]",
    outline: "border-2 border-gray-200 hover:border-gray-300 bg-transparent text-gray-900 active:scale-[0.98]",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600 active:scale-[0.98]"
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${disabled || isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
      <span className={isLoading ? 'opacity-0' : 'opacity-100'}>{children}</span>
      {isLoading && <span className="absolute inset-0 flex items-center justify-center">{children}</span>}
    </button>
  );
}
