import type { ReactNode } from 'react';

type DetailRowProps = {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DetailRow({ icon, children, className = '' }: DetailRowProps) {
  return (
    <li className={`landing-detail-row ${className}`.trim()}>
      <span className="landing-detail-row__icon">{icon}</span>
      <span className="landing-detail-row__copy">{children}</span>
    </li>
  );
}
