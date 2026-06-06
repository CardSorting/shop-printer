'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap } from 'lucide-react';
import { SLIDE_UP_VARIANTS } from '@ui/animations';
import { ProductCard } from '@ui/components/ProductCard';
import { ProductCardSkeleton } from '@ui/components/ProductCard/ProductCardSkeleton';
import type { Product } from '@domain/models';
import { LANDING_COPY } from '../copy';
import { AgencyCta } from './AgencyChrome';
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
  const [heroProduct, ...gridProducts] = products;

  return (
    <section id="landing-menu" className="landing-menu landing-menu--agency">
      <StudioContainer>
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-60px' }}
          variants={SLIDE_UP_VARIANTS}
          className="landing-menu__header"
        >
          <div>
            <SectionLabel index={menu.index} label={menu.label} />
            <StudioHeading size="display">
              {menu.headline[0]}
              <span className="landing-heading__accent">{menu.headline[1]}</span>
            </StudioHeading>
            <p className="landing-menu__lede">{menu.lede}</p>
          </div>
          <AgencyCta
            href={menu.cta.href}
            label={menu.cta.label}
            variant="text"
            className="landing-menu__link-cta"
            index="05"
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
        ) : (
          <div className="landing-menu__body">
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

            {hasMore && (
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
