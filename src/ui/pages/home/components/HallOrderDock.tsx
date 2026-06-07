'use client';

import Link from 'next/link';
import { MapPin, ShoppingBag, Store } from 'lucide-react';
import { useMotionValueEvent, type MotionValue } from 'framer-motion';
import { useState } from 'react';
import { useCart } from '@ui/hooks/useCart';
import { LANDING_COPY } from '../copy';
import { HoverLink, Pressable } from './MicroMotion';

const { orderDock, pulse } = LANDING_COPY;

type HallOrderDockProps = {
  progress: MotionValue<number>;
};

export function HallOrderDock({ progress }: HallOrderDockProps) {
  const [visible, setVisible] = useState(false);
  const { totalItems, openCart } = useCart();

  useMotionValueEvent(progress, 'change', (v) => {
    setVisible(v > 0.06 && v < 0.92);
  });

  const orderLabel = totalItems > 0 ? `${orderDock.order} (${totalItems})` : orderDock.order;

  return (
    <nav
      className={`landing-order-dock ${visible ? 'landing-order-dock--visible' : ''}`}
      aria-label="Quick hall actions"
      aria-hidden={!visible}
    >
      {totalItems > 0 ? (
        <Pressable
          type="button"
          className="landing-order-dock__btn landing-order-dock__btn--primary"
          onClick={() => openCart()}
        >
          <ShoppingBag className="h-4 w-4" aria-hidden />
          {orderLabel}
        </Pressable>
      ) : (
        <HoverLink className="landing-order-dock__link-wrap">
          <Link href={pulse.menu.href} className="landing-order-dock__btn landing-order-dock__btn--primary">
            <ShoppingBag className="h-4 w-4" aria-hidden />
            {orderLabel}
          </Link>
        </HoverLink>
      )}
      <HoverLink className="landing-order-dock__link-wrap">
        <Link href={pulse.vendors.href} className="landing-order-dock__btn">
          <Store className="h-4 w-4" aria-hidden />
          {orderDock.counters}
        </Link>
      </HoverLink>
      <HoverLink className="landing-order-dock__link-wrap">
        <Link href={pulse.visit.href} className="landing-order-dock__btn">
          <MapPin className="h-4 w-4" aria-hidden />
          {orderDock.map}
        </Link>
      </HoverLink>
    </nav>
  );
}
