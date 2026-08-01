import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  containerClassName?: string;
}

export function SearchBar({ className = '', containerClassName = '', ...props }: SearchBarProps) {
  return (
    <div className={['relative flex-1', containerClassName].join(' ')}>
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        type="search"
        className={[
          'w-full h-9 bg-white border border-gray-200 rounded-lg',
          'pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400',
          'hover:border-gray-300 focus:outline-none focus:ring-2',
          'focus:ring-blue-500/20 focus:border-blue-500 transition-all',
          className,
        ].join(' ')}
        {...props}
      />
    </div>
  );
}
