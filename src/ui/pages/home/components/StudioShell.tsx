import type { ReactNode } from 'react';

type StudioShellProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  dark?: boolean;
  guided?: boolean;
  cinematic?: boolean;
};

export function StudioShell({ children, className = '', id, dark = false, guided = false, cinematic = false }: StudioShellProps) {
  return (
    <div
      id={id}
      className={`landing-page ${guided ? 'landing-page--guided' : ''} ${cinematic ? 'landing-page--cinematic' : ''} ${dark ? 'landing-page--dark' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

type StudioContainerProps = {
  children: ReactNode;
  className?: string;
  wide?: boolean;
};

export function StudioContainer({ children, className = '', wide = false }: StudioContainerProps) {
  return (
    <div className={`landing-container ${wide ? 'landing-container--wide' : ''} ${className}`.trim()}>
      {children}
    </div>
  );
}

type SectionLabelProps = {
  label: string;
  index?: string;
  dark?: boolean;
  hall?: boolean;
  className?: string;
};

export function SectionLabel({ index, label, dark = false, hall = true, className = '' }: SectionLabelProps) {
  return (
    <div
      className={`landing-section-label ${hall ? 'landing-section-label--hall' : ''} ${dark ? 'landing-section-label--dark' : ''} ${className}`.trim()}
    >
      {!hall && index && <span className="landing-section-label__index">{index}</span>}
      {!hall && <span className="landing-section-label__rule" aria-hidden />}
      <span className="landing-section-label__text">{label}</span>
    </div>
  );
}

type StudioHeadingProps = {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  size?: 'hero' | 'display' | 'section';
  className?: string;
};

export function StudioHeading({
  children,
  as: Tag = 'h2',
  size = 'section',
  className = '',
}: StudioHeadingProps) {
  return <Tag className={`landing-heading landing-heading--${size} ${className}`.trim()}>{children}</Tag>;
}
