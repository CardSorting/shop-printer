'use client';

import { motion } from '../motion';
import { AnimatePresence } from 'framer-motion';
import { HALL_FOOD_PARALLAX_FRAMES } from '../constants';
import { useActiveFoodPassScroll, useFoodTourProgress } from '../hooks/useFoodTourScroll';
import { scrollToLandingSection } from '../hooks/useLandingSectionNav';
import { useFoodStoryNav } from '../hooks/useFoodStoryNav';
import { ParallaxMotion } from './ParallaxMotion';

type FoodStoryRailActiveProps = {
  activePass: string;
};

/** Mounted only while a food pass is active — keeps scroll hooks off idle renders */
function FoodStoryRailActive({ activePass }: FoodStoryRailActiveProps) {
  const passProgress = useActiveFoodPassScroll(activePass);
  const tourProgress = useFoodTourProgress(activePass, passProgress);
  const activeIndex = HALL_FOOD_PARALLAX_FRAMES.findIndex((f) => f.id === activePass);

  return (
    <motion.nav
      className="landing-food-story-rail"
      aria-label="Photo tour progress"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="landing-food-story-rail__label">On the floor</span>

      <div className="landing-food-story-rail__track" aria-hidden>
        <ParallaxMotion className="landing-food-story-rail__fill" modes={['scale-x']} scaleX={tourProgress} />
      </div>

      <ol className="landing-food-story-rail__steps">
        {HALL_FOOD_PARALLAX_FRAMES.map((frame, index) => {
          const isActive = frame.id === activePass;
          const isPast = activeIndex > index;

          return (
            <li key={frame.id}>
              <button
                type="button"
                className={`landing-food-story-rail__step${isActive ? ' landing-food-story-rail__step--active' : ''}${isPast ? ' landing-food-story-rail__step--past' : ''}`}
                onClick={() => scrollToLandingSection(`landing-food-${frame.id}`)}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="landing-food-story-rail__step-index">{index + 1}</span>
                <span className="landing-food-story-rail__step-name">{frame.kicker}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </motion.nav>
  );
}

/** Global 3-step indicator while food parallax bands are in view */
export function LandingFoodStoryRail() {
  const { activePass } = useFoodStoryNav();

  return (
    <AnimatePresence>
      {activePass ? <FoodStoryRailActive key={activePass} activePass={activePass} /> : null}
    </AnimatePresence>
  );
}
