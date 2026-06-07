'use client';

import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAGE_TRANSITION_VARIANTS } from '@ui/animations';

type StorefrontAnimatedMainProps = {
  pathname: string;
  className: string;
  children: ReactNode;
};

export function StorefrontAnimatedMain({ pathname, className, children }: StorefrontAnimatedMainProps) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.main
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={PAGE_TRANSITION_VARIANTS}
        className={className}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
