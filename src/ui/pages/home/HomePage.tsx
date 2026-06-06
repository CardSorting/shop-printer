'use client';

/**
 * [LAYER: UI]
 */
import './styles/index.css';
import { useScroll } from 'framer-motion';
import { useCart } from '@ui/hooks/useCart';
import { ScrollProgressRail, ScrollTicker } from './components/AgencyChrome';
import { HeroSection } from './components/HeroSection';
import { MarqueeStrip } from './components/MarqueeStrip';
import { StorySection } from './components/StorySection';
import { EditorialBreak } from './components/EditorialBreak';
import { VoicesSection } from './components/VoicesSection';
import { VendorsSection } from './components/VendorsSection';
import { MenuSection } from './components/MenuSection';
import { VisitSection } from './components/VisitSection';
import { StudioShell } from './components/StudioShell';
import { useFeaturedProducts } from './hooks/useFeaturedProducts';

export function HomePage() {
  const { scrollYProgress } = useScroll();
  const { addItem } = useCart();
  const { products, loading, loadingMore, hasMore, error, loadMore } = useFeaturedProducts(8);

  const handleQuickAdd = async (productId: string) => {
    try {
      await addItem(productId, 1);
      window.dispatchEvent(new CustomEvent('cart:open'));
    } catch (err) {
      console.error('Quick add failed', err);
    }
  };

  return (
    <StudioShell>
      <ScrollProgressRail progress={scrollYProgress} />
      <ScrollTicker progress={scrollYProgress} />
      <HeroSection />
      <MarqueeStrip />
      <StorySection />
      <EditorialBreak />
      <VoicesSection />
      <VendorsSection />
      <MenuSection
        products={products}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        error={error}
        onLoadMore={loadMore}
        onQuickAdd={handleQuickAdd}
      />
      <VisitSection />
    </StudioShell>
  );
}
