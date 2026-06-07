import Link from 'next/link';
import type { ReactNode } from 'react';

type HallCtaProps = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'text';
  className?: string;
  icon?: ReactNode;
  dark?: boolean;
};

export function HallCta({
  href,
  label,
  variant = 'primary',
  className = '',
  icon,
  dark = false,
}: HallCtaProps) {
  return (
    <Link
      href={href}
      className={`hall-cta hall-cta--${variant} ${dark ? 'hall-cta--dark' : ''} ${className}`.trim()}
    >
      <span className="hall-cta__label">{label}</span>
      {icon && <span className="hall-cta__icon">{icon}</span>}
    </Link>
  );
}
