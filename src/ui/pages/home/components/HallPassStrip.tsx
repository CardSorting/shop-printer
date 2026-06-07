'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import type { Product } from '@domain/models';
import { LANDING_COPY } from '../copy';

const { passStrip } = LANDING_COPY;

type HallPassStripProps = {
  products: Product[];
  onQuickAdd: (productId: string) => void;
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price / 100);
}

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
        <Link href="/products" className="landing-pass-strip__link">
          Full menu
        </Link>
      </div>

      <div className="landing-pass-strip__track">
        {items.map((product) => {
          const img = product.imageUrl || product.media?.[0]?.url;
          const vendor = product.vendor ?? 'Hall menu';
          const handle = product.handle || product.id;

          return (
            <article key={product.id} className="landing-pass-strip__card">
              <Link href={`/products/${handle}`} className="landing-pass-strip__media">
                {img ? (
                  <Image src={img} alt="" fill sizes="160px" className="object-cover" />
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
                  <button
                    type="button"
                    className="landing-pass-strip__add"
                    aria-label={`Add ${product.name} to cart`}
                    onClick={() => onQuickAdd(product.id)}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
