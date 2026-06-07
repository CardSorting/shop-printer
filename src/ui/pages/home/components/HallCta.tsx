import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';

type HallCtaProps = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'text';
  className?: string;
  icon?: ReactNode;
  dark?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function HallCta({
  href,
  label,
  variant = 'primary',
  className = '',
  icon,
  dark = false,
  onClick,
}: HallCtaProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`hall-cta hall-cta--${variant} ${dark ? 'hall-cta--dark' : ''} ${className}`.trim()}
    >
      <span className="hall-cta__label">{label}</span>
      {icon && <span className="hall-cta__icon">{icon}</span>}
    </Link>
  );
}
