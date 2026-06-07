'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap } from 'lucide-react';
import { SLIDE_UP_VARIANTS } from '@ui/animations';
import { ProductCard } from '@ui/components/ProductCard';
import { ProductCardSkeleton } from '@ui/components/ProductCard/ProductCardSkeleton';
import type { Product } from '@domain/models';
import { LANDING_COPY } from '../copy';
import { MENU_CATEGORIES } from '../constants';
import { HallCta } from './HallCta';
import { HallPassStrip } from './HallPassStrip';
import { SectionLabel, StudioContainer, StudioHeading } from './StudioShell';

const { menu } = LANDING_COPY;

type MenuSectionProps = {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  onLoadMore: () => void;
  onQuickAdd: (productId: string) => void;
};

export function MenuSection({
  products,
  loading,
  loadingMore,
  hasMore,
  error,
  onLoadMore,
  onQuickAdd,
}: MenuSectionProps) {
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  const vendors = useMemo(() => {
    const names = new Set<string>();
    for (const p of products) {
      if (p.vendor?.trim()) names.add(p.vendor.trim());
    }
    return [...names].sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (vendorFilter === 'all') return products;
    return products.filter((p) => p.vendor?.trim() === vendorFilter);
  }, [products, vendorFilter]);

  const [heroProduct, ...gridProducts] = filtered;

  return (
    <section id="landing-menu" className="landing-menu">
      <StudioContainer>
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-60px' }}
          variants={SLIDE_UP_VARIANTS}
          className="landing-menu__header"
        >
          <div>
            <SectionLabel label={menu.label} />
            <StudioHeading size="display">
              {menu.headline[0]}
              <span className="landing-heading__accent">{menu.headline[1]}</span>
            </StudioHeading>
            <p className="landing-menu__lede">{menu.lede}</p>
            <p className="landing-menu__order-hint">{menu.orderHint}</p>

            <div className="landing-menu__pickup" aria-label="How to order ahead">
              {menu.pickupSteps.map((step, i) => (
                <span key={step} className="landing-menu__pickup-step">
                  <span className="landing-menu__pickup-index">{String(i + 1).padStart(2, '0')}</span>
                  {step}
                </span>
              ))}
            </div>

            <div className="landing-menu__categories">
              <p className="landing-menu__categories-label">{menu.categoriesLabel}</p>
              <nav className="landing-menu__chips" aria-label="Menu categories">
                {MENU_CATEGORIES.map((cat) => (
                  <Link key={cat.href} href={cat.href} className="landing-menu__chip">
                    {cat.label}
                  </Link>
                ))}
              </nav>
            </div>

            {vendors.length > 0 && (
              <div className="landing-menu__vendors">
                <p className="landing-menu__vendors-label">{menu.vendorFilterLabel}</p>
                <div className="landing-menu__vendor-chips" role="tablist" aria-label="Filter by counter">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={vendorFilter === 'all'}
                    className={`landing-menu__vendor-chip ${vendorFilter === 'all' ? 'landing-menu__vendor-chip--active' : ''}`}
                    onClick={() => setVendorFilter('all')}
                  >
                    {menu.allCounters}
                  </button>
                  {vendors.map((vendor) => (
                    <button
                      key={vendor}
                      type="button"
                      role="tab"
                      aria-selected={vendorFilter === vendor}
                      className={`landing-menu__vendor-chip ${vendorFilter === vendor ? 'landing-menu__vendor-chip--active' : ''}`}
                      onClick={() => setVendorFilter(vendor)}
                    >
                      {vendor}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <HallCta
            href={menu.cta.href}
            label={menu.cta.label}
            variant="text"
            className="landing-menu__link-cta"
            icon={<ArrowRight className="h-4 w-4" />}
          />
        </motion.div>

        {loading ? (
          <div className="landing-menu__grid landing-menu__grid--loading">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="landing-menu__error">
            <Shield className="h-5 w-5" /> {error}
          </div>
        ) : filtered.length === 0 ? (
          <p className="landing-menu__empty">{menu.emptyVendor}</p>
        ) : (
          <div className="landing-menu__body">
            <HallPassStrip products={filtered} onQuickAdd={onQuickAdd} />

            {heroProduct && (
              <motion.div
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="landing-menu__spotlight"
              >
                <p className="landing-menu__spotlight-label">{menu.spotlight}</p>
                <ProductCard product={heroProduct} onAddToCart={onQuickAdd} priority />
              </motion.div>
            )}

            <div className="landing-menu__grid">
              {gridProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.55, delay: (i % 4) * 0.06 }}
                  className="h-full"
                >
                  <ProductCard product={product} onAddToCart={onQuickAdd} priority={i < 3} />
                </motion.div>
              ))}
            </div>

            {hasMore && vendorFilter === 'all' && (
              <div className="landing-menu__more">
                <button type="button" onClick={onLoadMore} disabled={loadingMore} className="landing-menu__more-btn group">
                  {loadingMore ? (
                    <>
                      <span className="landing-menu__spinner" />
                      {menu.loading}
                    </>
                  ) : (
                    <>
                      {menu.loadMore}
                      <Zap className="h-4 w-4 text-primary-500 group-hover:text-primary-300" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </StudioContainer>
    </section>
  );
}
