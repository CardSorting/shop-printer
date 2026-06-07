'use client';

import { useTransform, type MotionValue } from 'framer-motion';
import { LANDING_SECTIONS } from '../copy';
import { scrollToLandingSection } from '../hooks/useLandingSectionNav';
import { useLandingActiveSection } from '../hooks/useLandingActiveSection';
import { useThrottledMotionPercent } from '../hooks/useThrottledMotionValue';
import { Pressable } from './MicroMotion';
import { ParallaxMotion } from './ParallaxMotion';

type LandingScrollChapterRailProps = {
  progress: MotionValue<number>;
};

/** Fixed chapter rail — GPU fill, throttled pct (no per-frame React updates) */
export function LandingScrollChapterRail({ progress }: LandingScrollChapterRailProps) {
  const pct = useThrottledMotionPercent(progress);
  const { activeId } = useLandingActiveSection();
  const fillScale = useTransform(progress, [0, 1], [0, 1]);

  const activeIndex = LANDING_SECTIONS.findIndex((s) => s.id === activeId);
  const active = LANDING_SECTIONS[activeIndex] ?? LANDING_SECTIONS[0];
  const chapter = String(activeIndex + 1).padStart(2, '0');

  return (
    <nav className="landing-chapter-rail" aria-label="Page chapters">
      <span className="landing-chapter-rail__pct font-display">{String(pct).padStart(2, '0')}</span>

      <div className="landing-chapter-rail__track" aria-hidden>
        <ParallaxMotion
          className="landing-chapter-rail__fill"
          modes={['transform']}
          scaleY={fillScale}
          style={{ transformOrigin: 'top center' }}
        />
      </div>

      <ol className="landing-chapter-rail__list">
        {LANDING_SECTIONS.map(({ id, shortLabel }, index) => {
          const isActive = activeId === id;
          const num = String(index + 1).padStart(2, '0');

          return (
            <li key={id}>
              <Pressable
                type="button"
                className={`landing-chapter-rail__dot${isActive ? ' landing-chapter-rail__dot--active' : ''}`}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${shortLabel}, section ${num}`}
                onClick={() => scrollToLandingSection(id)}
              >
                {isActive && <span className="landing-chapter-rail__indicator" aria-hidden />}
                <span className="landing-chapter-rail__index">{num}</span>
                <span className="landing-chapter-rail__label">{shortLabel}</span>
              </Pressable>
            </li>
          );
        })}
      </ol>

      <div className="landing-chapter-rail__active" aria-live="polite">
        <span className="landing-chapter-rail__active-chapter">{chapter}</span>
        <span className="landing-chapter-rail__active-label">{active.label}</span>
      </div>
    </nav>
  );
}
