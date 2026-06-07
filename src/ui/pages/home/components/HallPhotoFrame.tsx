import type { ReactNode } from 'react';

type HallPhotoFrameProps = {
  children: ReactNode;
  className?: string;
  caption?: string;
};

/** Warm food-hall photo frame — replaces agency corner brackets */
export function HallPhotoFrame({ children, className = '', caption }: HallPhotoFrameProps) {
  return (
    <figure className={`hall-photo-frame ${className}`.trim()}>
      <div className="hall-photo-frame__inner">{children}</div>
      {caption && <figcaption className="hall-photo-frame__caption">{caption}</figcaption>}
    </figure>
  );
}
