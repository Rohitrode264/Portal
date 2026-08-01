import type { CSSProperties } from 'react';

type IconProps = {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  filled?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
};

/**
 * Material Symbols Outlined icon wrapper.
 * Usage: <Icon name="home" size={20} />
 */
export function Icon({ name, size = 20, className = '', style, filled = false, weight = 400 }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
