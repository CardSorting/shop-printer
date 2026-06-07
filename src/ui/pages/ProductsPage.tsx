'use client';

/**
 * [LAYER: UI]
 */
import { useCallback, useEffect, useState, useRef } from 'react';
import { useServices } from '../hooks/useServices';
import { useCart } from '../hooks/useCart';
import type { Product, ProductCategory } from '@domain/models';
import { Search, ChevronRight, PackageSearch, X, LayoutGrid, Grid3X3, Grid2X2 } from 'lucide-react';
import { useWishlist } from '../hooks/useWishlist';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { getProductUrl, STORE_PATHS } from '@utils/navigation';
import { SITE_MENU_LINE, SITE_VENDOR_LINE } from '@utils/seo';
import { logger } from '@utils/logger';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ProductCard/ProductCardSkeleton';
import { QuickViewModal } from '../components/QuickViewModal';


export function ProductsPage({ resolvedType, resolvedSlug }: { resolvedType?: 'category' | 'collection'; resolvedSlug?: string } = {}) {
  const router = useRouter();
  const params = useParams();
  // Fallback to params if no resolved props provided (for compatibility)
  const fallbackSlug = (params?.slug as string | undefined) || (params?.handle as string | undefined); 
  const collectionSlug = resolvedSlug || fallbackSlug;
  const { addItem } = useCart();
  const wishlist = useWishlist();

  const services = useServices();
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [gridCols, setGridCols] = useState(3);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [collectionInfo, setCollectionInfo] = useState<{ name: string; description: string; imageUrl?: string } | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const loadProductsControllerRef = useRef<AbortController | null>(null);

  // Fetch taxonomy categories dynamically on mount
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/taxonomy/categories', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (!controller.signal.aborted && Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Initialize state from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sort = params.get('sort_by');
    const q = params.get('q') || params.get('search');

    if (collectionSlug) {
      if (collectionSlug === 'all') {
        // Handle the 'all' special case by not filtering by category or collection
      } else if (resolvedType === 'category') {
        setSelectedCategories([collectionSlug]);
      }
    }
    
    if (sort) setSortBy(sort);
    if (q) setSearch(q);
  }, [collectionSlug, resolvedType]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (sortBy !== 'newest') params.set('sort_by', sortBy);
    if (search.trim()) params.set('q', search.trim());

    const queryString = params.toString();
    const currentPath = window.location.pathname;
    const newUrl = queryString ? `${currentPath}?${queryString}` : currentPath;
    
    router.replace(newUrl, { scroll: false });
  }, [sortBy, search, router]);


  useEffect(() => {
    const controller = new AbortController();
    
    const loadMetadata = async () => {
      if (!collectionSlug || collectionSlug === 'all') {
        setCollectionInfo(null);
        return;
      }
      try {
        if (resolvedType === 'category') {
          const cat = await services.taxonomyService.getCategoryBySlug(collectionSlug);
          if (!controller.signal.aborted && cat) {
            setCollectionInfo({ name: cat.name, description: cat.description || '' });
          }
        } else if (resolvedType === 'collection') {
          const col = await services.collectionService.getCollectionByHandle(collectionSlug, controller.signal);
          if (!controller.signal.aborted && col) {
            setCollectionInfo({ name: col.name, description: col.description || '', imageUrl: col.imageUrl });
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        logger.warn(`Metadata lookup failed for ${resolvedType}:${collectionSlug}`, err);
      }
    };
    void loadMetadata();
    return () => controller.abort();
  }, [collectionSlug, resolvedType, services]);

  const loadProducts = useCallback(async (cursor?: string) => {
    loadProductsControllerRef.current?.abort();
    const controller = new AbortController();
    loadProductsControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const isCollectionType = resolvedType === 'collection';
      const result = await services.productService.getProducts({
        category: !isCollectionType && selectedCategories.length > 0 ? selectedCategories : undefined,
        collection: isCollectionType && collectionSlug ? collectionSlug : undefined,
        query: search.trim() || undefined,
        limit: 20,
        cursor,
        signal: controller.signal
      });
      
      if (!controller.signal.aborted) {
        const filtered = result.products;

        // Sorting
        if (sortBy === 'price_asc') filtered.sort((a, b) => a.price - b.price);
        if (sortBy === 'price_desc') filtered.sort((a, b) => b.price - a.price);
        if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

        setProducts(prev => cursor ? [...prev, ...filtered] : filtered);
        setNextCursor(result.nextCursor ?? null);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to load products');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [selectedCategories, sortBy, search, services.productService, resolvedType, collectionSlug]);

  const handleSearch = useCallback(async (value: string) => {
    setSearch(value);
  }, []);

  useEffect(() => {
    void loadProducts();
    return () => {
      loadProductsControllerRef.current?.abort();
    };
  }, [loadProducts]);

  const handleQuickAdd = async (productId: string) => {
    try {
      await addItem(productId, 1);
      window.dispatchEvent(new CustomEvent('cart:open'));
    } catch (err) {
      console.error('Quick add failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {quickViewProduct && (
        <QuickViewModal 
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={handleQuickAdd}
          isFavorited={wishlist.isInWishlist(quickViewProduct.id)}
          onToggleFavorite={async (id) => {
            if (wishlist.isInWishlist(id)) await wishlist.removeFromWishlist(id);
            else await wishlist.addToWishlist(id);
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumbs */}
        <Breadcrumbs 
          items={
            collectionInfo 
              ? [
                  { label: 'Hall Favorites', href: STORE_PATHS.MENU },
                  { label: collectionInfo.name }
                ]
              : [{ label: 'Vendors & Menu' }]
          } 
        />

        {/* Header */}
        <div className="mb-16">
           <h1 className="text-6xl font-black text-gray-900 tracking-tighter mb-6">
             {collectionInfo?.name || 'Vendors & Menu'}
           </h1>
           <div className="h-1.5 w-24 bg-primary-600 rounded-full mb-8" />
           <p className="text-xl text-gray-500 font-medium max-w-2xl leading-relaxed">
             {collectionInfo?.description || `${SITE_VENDOR_LINE} ${SITE_MENU_LINE}`}
           </p>
        </div>

        {/* Category Pills Navigation */}
        {categories.length > 0 && (
          <div className="mb-12 flex items-center gap-3 overflow-x-auto scrollbar-hide pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap border-b border-gray-100/60">
            <Link
              href={STORE_PATHS.MENU}
              className={`px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                !collectionSlug || collectionSlug === 'all'
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              All From the Hall
            </Link>
            {categories.map((cat) => {
              const isActive = collectionSlug === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={`/collections/${cat.slug}`}
                  className={`px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        )}

        {/* Search & Sort Bar */}
        <div className="flex flex-col lg:flex-row items-center gap-6 mb-16">
           <div className="relative flex-1 group w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search catalog..."
                className="w-full pl-16 pr-8 py-6 bg-gray-50 border-none rounded-3xl text-xl font-bold focus:bg-white focus:ring-4 focus:ring-primary-500/5 transition-all outline-none"
              />
           </div>
           <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative flex-1 lg:flex-none min-w-[240px]">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-10 py-6 bg-gray-50 border-none rounded-3xl font-black text-xs uppercase tracking-widest text-gray-900 appearance-none focus:bg-white focus:ring-4 focus:ring-primary-500/5 outline-none cursor-pointer"
                >
                  <option value="newest">Sort By: Newest</option>
                  <option value="price_asc">Sort By: Price Low-High</option>
                  <option value="price_desc">Sort By: Price High-Low</option>
                  <option value="name">Sort By: Alphabetical</option>
                </select>
                <ChevronRight className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 text-gray-400 pointer-events-none" />
              </div>

              <div className="hidden lg:flex items-center gap-2 p-1 bg-gray-50 rounded-2xl ml-4">
                <button 
                  onClick={() => setGridCols(2)}
                  title="2-column grid view"
                  className={`p-3 rounded-xl transition-all ${gridCols === 2 ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Grid2X2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setGridCols(3)}
                  title="3-column grid view"
                  className={`p-3 rounded-xl transition-all ${gridCols === 3 ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setGridCols(4)}
                  title="4-column grid view"
                  className={`p-3 rounded-xl transition-all ${gridCols === 4 ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
              </div>
           </div>
        </div>

        {/* Active Filters (Pills) */}
        {search && (
          <div className="flex flex-wrap items-center gap-3 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mr-2 shrink-0">
                Active Search:
             </div>
             <div className="flex flex-wrap items-center gap-2">
                 <button 
                   onClick={() => setSearch('')}
                   className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all border border-transparent shadow-lg shadow-gray-200"
                 >
                   "{search}" <X className="w-3 h-3" />
                 </button>
             </div>
          </div>
        )}

        {/* Results Container (No sidebar) */}
        <div className="w-full">
          {loading && products.length === 0 ? (
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols === 2 ? 'xl:grid-cols-2' : gridCols === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-8`}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-32 text-center rounded-[3rem] bg-gray-50 border border-gray-100 px-6">
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl mb-8">
                <PackageSearch className="h-10 w-10 text-gray-200" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">No results matched your search</h3>
              <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium">Try broadening your search query to discover more items.</p>
              <button 
                onClick={() => setSearch('')}
                className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                 <p className="text-sm font-bold text-gray-400 tracking-tight">Showing <span className="text-gray-900">{products.length}</span> items</p>
              </div>
              <div 
                className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols === 2 ? 'xl:grid-cols-2' : gridCols === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-x-8 gap-y-16 animate-in fade-in duration-700`}
                itemScope itemType="https://schema.org/ItemList"
              >
                <meta itemProp="numberOfItems" content={products.length.toString()} />
                {products.map((p, i) => (
                  <div key={p.id} className="h-full" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                    <meta itemProp="position" content={(i + 1).toString()} />
                    <meta itemProp="name" content={p.name} />
                    <link itemProp="url" href={getProductUrl(p)} />
                    <ProductCard 
                      product={p} 
                      onAddToCart={handleQuickAdd}
                      onQuickView={setQuickViewProduct}
                      priority={i < (gridCols * 2)}
                    />
                  </div>
                ))}
              </div>

              {nextCursor && !search && (
                <div className="mt-20 text-center">
                  <button
                    onClick={() => void loadProducts(nextCursor)}
                    className="inline-flex items-center gap-3 rounded-4xl bg-gray-900 px-12 py-5 font-black text-xs uppercase tracking-widest text-white shadow-2xl transition hover:bg-black hover:-translate-y-1 active:translate-y-0"
                  >
                    Load More Items <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
