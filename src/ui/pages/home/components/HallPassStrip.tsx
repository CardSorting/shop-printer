'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { Product } from '@domain/models';
import { LANDING_COPY } from '../copy';
import { HoverLift, HoverLink, Pressable } from './MicroMotion';

const { passStrip } = LANDING_COPY;

type HallPassStripProps = {
  products: Product[];
  onQuickAdd: (productId: string) => void;
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price / 100);
}

const CARD_VARIANTS = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function HallPassStrip({ products, onQuickAdd }: HallPassStripProps) {
  const items = products.slice(0, 6);
  if (!items.length) return null;

  return (
    <div className="landing-pass-strip" aria-labelledby="pass-strip-heading">
      <div className="landing-pass-strip__header">
        <div>
          <p id="pass-strip-heading" className="landing-pass-strip__label">
            {passStrip.label}
          </p>
          <p className="landing-pass-strip__sub">{passStrip.sub}</p>
        </div>
        <HoverLink>
          <Link href="/products" className="landing-pass-strip__link">
            Full menu
          </Link>
        </HoverLink>
      </div>

      <motion.div
        className="landing-pass-strip__track"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-20px' }}
        variants={{
          initial: {},
          animate: { transition: { staggerChildren: 0.07 } },
        }}
      >
        {items.map((product) => {
          const img = product.imageUrl || product.media?.[0]?.url;
          const vendor = product.vendor ?? 'Hall menu';
          const handle = product.handle || product.id;

          return (
            <HoverLift
              key={product.id}
              className="landing-pass-strip__card"
              lift={-4}
              variants={CARD_VARIANTS}
            >
              <Link href={`/products/${handle}`} className="landing-pass-strip__media group">
                {img ? (
                  <Image src={img} alt="" fill sizes="160px" className="object-cover landing-pass-strip__img" />
                ) : (
                  <div className="landing-pass-strip__placeholder" aria-hidden />
                )}
              </Link>
              <div className="landing-pass-strip__body">
                <p className="landing-pass-strip__vendor">{vendor}</p>
                <Link href={`/products/${handle}`} className="landing-pass-strip__title">
                  {product.name}
                </Link>
                <div className="landing-pass-strip__row">
                  <span className="landing-pass-strip__price">{formatPrice(product.price)}</span>
                  <Pressable
                    type="button"
                    className="landing-pass-strip__add"
                    aria-label={`Add ${product.name} to cart`}
                    onClick={() => onQuickAdd(product.id)}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </Pressable>
                </div>
              </div>
            </HoverLift>
          );
        })}
      </motion.div>
    </div>
  );
}
