'use client';

/**
 * [LAYER: UI]
 */
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useServices } from '../hooks/useServices';
import type { Product, KnowledgebaseArticle } from '@domain/models';
import { ArrowRight, Sparkles, Shield, Users, Zap, MapPin, CalendarDays, Heart, Handshake } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ProductCard/ProductCardSkeleton';
import { useCart } from '../hooks/useCart';
import {
  COMMUNITY_CHIPS,
  COMMUNITY_PILLARS,
  COMMUNITY_RITUALS,
  ROOM_VOICES,
  SITE_BELONGING_LINE,
  SITE_COMMUNITY_PROMISE,
  SITE_COMMUNITY_LINE,
  SITE_CTA,
  SITE_DESCRIPTION,
  SITE_GATHERING_LINE,
  SITE_MENU_LINE,
  SITE_ROOM_ESSENCE,
  SITE_VENDOR_LINE,
} from '@utils/seo';
import Image from 'next/image';
import { DEFAULT_BLOG_IMAGE, DEFAULT_FOOD_HALL_IMAGE } from '@utils/imageFallback';

export function HomePage() {
  const services = useServices();
  const { addItem } = useCart();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [latestPosts, setLatestPosts] = useState<KnowledgebaseArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    
    const loadInitial = async () => {
      try {
        const result = await services.productService.getProducts({ limit: 8, signal: controller.signal });
        if (!controller.signal.aborted) {
          setFeatured(result.products);
          setNextCursor(result.nextCursor);
          setHasMore(!!result.nextCursor);
          setError(null);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load featured products');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadInitial();
    return () => {
      controller.abort();
      loadMoreControllerRef.current?.abort();
    };
  }, [services]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    
    loadMoreControllerRef.current?.abort();
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    
    setLoadingMore(true);
    try {
      const result = await services.productService.getProducts({ 
        limit: 8,
        cursor: nextCursor,
        signal: controller.signal
      });
      
      if (!controller.signal.aborted) {
        setFeatured(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = result.products.filter(p => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });
        
        setNextCursor(result.nextCursor);
        setHasMore(!!result.nextCursor);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Load more failed', err);
    } finally {
      if (!controller.signal.aborted) {
        setLoadingMore(false);
      }
    }
  };

  const handleQuickAdd = async (productId: string) => {
    try {
      await addItem(productId, 1);
      window.dispatchEvent(new CustomEvent('cart:open'));
    } catch (err) {
      console.error('Quick add failed', err);
    }
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-900 text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-linear-to-br from-gray-950 via-gray-900 to-primary-900 opacity-95 z-10"></div>
          <div className="absolute inset-0 hero-pattern z-15 opacity-50"></div>
          <div className="absolute inset-0 z-16 pointer-events-none overflow-hidden">
            {mounted && [...Array(20)].map((_, i) => (
              <div 
                key={i} 
                className="pollen" 
                style={{ 
                  left: `${Math.random() * 100}%`, 
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${4 + Math.random() * 6}s`
                }} 
              />
            ))}
          </div>
          <Image 
            src={DEFAULT_FOOD_HALL_IMAGE} 
            alt="WoodBine food hall in a restored Salt Lake warehouse" 
            fill
            priority
            sizes="100vw"
            className="object-cover" 
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative z-20 text-center lg:text-left flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-primary-200 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-3 h-3" /> A Neighborhood Table
            </div>
            <h1 data-seo-speakable className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
              Old Hall. <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-400 to-primary-200">New Flavors.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {SITE_DESCRIPTION}
            </p>
            <p className="text-base text-primary-200/90 font-semibold italic max-w-xl mx-auto lg:mx-0">
              {SITE_GATHERING_LINE}
            </p>
            <p className="text-sm text-gray-400 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {SITE_COMMUNITY_LINE}
            </p>
            <p className="text-xs text-primary-300/80 font-bold uppercase tracking-[0.2em] max-w-xl mx-auto lg:mx-0 pt-2">
              {SITE_BELONGING_LINE}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2">
              <Link
                href="/products"
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 btn-honey-glazed text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary-500/20"
              >
                Taste
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/support"
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-gray-800 text-white border border-gray-700 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-700 transition-all"
              >
                No Reservations — Just Good Company
              </Link>
            </div>
          </div>
          <div className="flex-1 hidden lg:block">
            <div className="grid grid-cols-2 gap-4 translate-x-8">
               <div className="space-y-4 pt-12">
                 <div className="relative aspect-4/5 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
                   <Image 
                    src={DEFAULT_FOOD_HALL_IMAGE} 
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover" 
                    alt="Food and drinks at WoodBine food hall" 
                   />
                 </div>
               </div>
               <div className="space-y-4">
                 <div className="relative aspect-4/5 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
                   <Image 
                    src={DEFAULT_BLOG_IMAGE} 
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover" 
                    alt="Vendors and seating inside the WoodBine warehouse" 
                   />
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Benefits Bar */}
      <section className="py-8 border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center justify-center sm:justify-start gap-4 p-4 group">
              <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                <Heart className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">All Welcome</h3>
                <p className="text-xs text-gray-500 font-medium">Walk in, pull up a chair</p>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-4 p-4 group">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                <Handshake className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Local Vendors</h3>
                <p className="text-xs text-gray-500 font-medium">Neighbors with a story</p>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-4 p-4 group">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Shared Tables</h3>
                <p className="text-xs text-gray-500 font-medium">Solo, crew, or new friends</p>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-4 p-4 group">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Third Place</h3>
                <p className="text-xs text-gray-500 font-medium">Work, linger, belong</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community narrative */}
      <section className="py-20 bg-primary-50/40 border-b border-primary-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <p className="text-[10px] font-black text-primary-600 uppercase tracking-[0.25em]">Built for Gathering</p>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Food brings you in.
              <br />
              <span className="text-primary-700">People bring you back.</span>
            </h2>
            <p className="text-lg text-gray-600 font-medium leading-relaxed">
              {SITE_ROOM_ESSENCE}
            </p>
            <p className="text-base text-gray-500 font-medium leading-relaxed italic">
              {SITE_BELONGING_LINE}
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              {COMMUNITY_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="px-4 py-2 rounded-full bg-white border border-primary-100 text-[11px] font-black uppercase tracking-widest text-gray-700"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who shares this table */}
      <section className="py-24 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Who Shares This Table</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              Everyone has a seat here.
            </h2>
            <p className="text-gray-500 font-medium">
              WoodBine works because the room is mixed—vendors, regulars, and newcomers all eating from the same big, open floor.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {COMMUNITY_PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-3xl border border-gray-100 bg-gray-50/50 p-8 hover:border-primary-100 hover:shadow-lg transition-all"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 mb-3">{pillar.subtitle}</p>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-4">{pillar.title}</h3>
                <p className="text-gray-600 font-medium leading-relaxed">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voices from the room */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14 space-y-3 max-w-2xl mx-auto">
            <p className="text-[10px] font-black text-primary-400 uppercase tracking-[0.25em]">Voices from the Room</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">The hall, in their words.</h2>
            <p className="text-gray-400 font-medium text-sm">Regulars, vendors, and first-timers—same room, different stories.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ROOM_VOICES.map((voice) => (
              <blockquote
                key={voice.role}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
              >
                <p className="text-lg font-medium leading-relaxed text-gray-200">&ldquo;{voice.quote}&rdquo;</p>
                <footer className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary-400">
                  — {voice.role}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Community promise */}
      <section className="py-24 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <p className="text-[10px] font-black text-primary-200 uppercase tracking-[0.25em]">Our Promise to the Room</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">This hall belongs to the people in it.</h2>
            <p className="text-primary-100 font-medium">
              Not a franchise. Not a food court. A community table we show up for—guests, vendors, and staff alike.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {SITE_COMMUNITY_PROMISE.map((promise) => (
              <div key={promise.title} className="rounded-3xl border border-white/15 bg-white/10 p-8 backdrop-blur-sm">
                <h3 className="text-xl font-black tracking-tight mb-4">{promise.title}</h3>
                <p className="text-primary-50 font-medium leading-relaxed">{promise.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hall rituals */}
      <section className="py-20 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div className="max-w-xl space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">How the Room Works</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Little rituals. Big belonging.</h2>
              <p className="text-gray-500 font-medium">Community here isn&apos;t programmed—it emerges from the same faces, the same flavors, and the same open door.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {COMMUNITY_RITUALS.map((ritual) => (
              <div key={ritual.title} className="rounded-2xl border border-gray-100 p-6 hover:border-primary-100 hover:shadow-md transition-all">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary-700 mb-3">{ritual.title}</h3>
                <p className="text-sm text-gray-600 font-medium leading-relaxed">{ritual.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Collections - Minimalist Strategy */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16 border-l-4 border-primary-500 pl-8">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">Our Vendors</h2>
            <p className="text-gray-500 font-medium max-w-2xl">{SITE_VENDOR_LINE}</p>
            <p className="text-sm text-gray-400 font-medium max-w-2xl mt-3">
              These are the neighbors fueling the room—each with their own counter, their own regulars, and a reason to stick around.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { 
                href: "/collections/artist-cards", 
                title: "Full Plates", 
                sub: "Gather around something hearty",
                img: DEFAULT_BLOG_IMAGE,
                delay: "reveal-delay-1"
              },
              { 
                href: "/collections/prints", 
                title: "Cold Drinks", 
                sub: "Raise a glass with the room",
                img: DEFAULT_FOOD_HALL_IMAGE,
                delay: "reveal-delay-2"
              },
              { 
                href: "/collections/accessories", 
                title: "Coffee & Work", 
                sub: "Your corner of the hall",
                img: DEFAULT_FOOD_HALL_IMAGE,
                delay: "reveal-delay-3"
              }
            ].map((col) => (
              <Link key={col.href} href={col.href} className={`group block opacity-0 reveal-up ${col.delay}`}>
                <div className="relative aspect-3/2 overflow-hidden rounded-2xl bg-gray-100 mb-6 border border-gray-100 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary-500/10">
                  <Image 
                    src={col.img} 
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-1000 group-hover:scale-110" 
                    alt={`Explore ${col.title}: ${col.sub}`} 
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    {col.title}
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary-600" />
                  </h3>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter mt-1">{col.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="honey-drip-divider" />

      {/* Featured Products */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter mb-4">What the Room Is Ordering</h2>
              <p className="text-gray-500 font-medium max-w-lg">{SITE_MENU_LINE}</p>
            </div>
            <Link href="/collections/all" className="group mt-4 sm:mt-0 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary-600 hover:text-primary-700">
              View the Full Menu <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600 font-bold flex items-center gap-3">
              <Shield className="w-5 h-5" /> {error}
            </div>
          ) : (
            <div className="space-y-20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
                {featured.map((p, i) => (
                  <div key={p.id} className={`opacity-0 reveal-up h-full`} style={{ animationDelay: `${i * 0.1}s` }}>
                    <ProductCard 
                      product={p} 
                      onAddToCart={handleQuickAdd}
                      priority={i < 4}
                    />
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="group relative inline-flex items-center gap-3 px-10 py-4 bg-white border-2 border-gray-900 rounded-2xl text-sm font-black uppercase tracking-widest text-gray-900 hover:bg-gray-900 hover:text-white transition-all shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? (
                      <>
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Loading Items...
                      </>
                    ) : (
                      <>
                        Load More Favorites <Zap className="w-4 h-4 text-amber-500 group-hover:text-white transition-colors" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>



      {/* Provisions, Pals & Play */}
      <section className="py-32 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 hero-pattern"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-black uppercase tracking-widest">
                <Users className="w-3 h-3" /> Your Third Place
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                Provisions, Pals <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-400 to-primary-200">&amp; Play</span>
              </h2>
              <div className="space-y-6 text-gray-300 text-lg font-medium leading-relaxed">
                <p>{SITE_CTA}</p>
                <p>
                  WoodBine is for the coworker you grab lunch with every Tuesday, the birthday dinner that turns into ping pong, and the quiet afternoon when you just need a good sandwich and a seat by the window. Bring your people—or come alone and leave with more than you walked in with. The best nights here rarely start with a plan; they start with showing up.
                </p>
                <p className="text-sm border-l-2 border-primary-500 pl-6 italic text-gray-400">
                  Provisions, pals, and a good amount of play—all under one big, barrel roof. That&apos;s the whole point.
                </p>
              </div>
              <div className="flex flex-wrap gap-x-12 gap-y-6 pt-10 border-t border-white/10">
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-white tracking-tighter">Regulars</span>
                  <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em]">Welcome Back</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-white tracking-tighter">First-Timers</span>
                  <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em]">Pull Up a Chair</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-white tracking-tighter">Your Crew</span>
                  <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em]">Events &amp; Play</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-4xl bg-linear-to-br from-primary-600 to-primary-800 p-px">
                <div className="h-full w-full rounded-[calc(2.5rem-1px)] bg-gray-950 flex flex-col items-center justify-center text-center p-8 md:p-16 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-3xl rounded-full"></div>
                   
                   <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-10 rotate-3 hover:rotate-0 transition-transform duration-500">
                     <CalendarDays className="w-10 h-10 text-primary-500" />
                   </div>
                   <h3 className="text-3xl md:text-4xl font-black mb-4 uppercase tracking-tight">Pull Up a Chair</h3>
                   <p className="text-gray-400 mb-12 font-medium">Hours, vendors, private events—or just come as you are. Someone&apos;s always glad you showed up.</p>
                   <Link 
                    href="/support" 
                    className="w-full inline-flex justify-center items-center gap-2 btn-honey-glazed text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-primary-500/20"
                   >
                     Join the Room
                     <ArrowRight className="w-4 h-4" />
                   </Link>
                </div>
              </div>
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary-500/20 blur-3xl rounded-full -z-10"></div>
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full -z-10"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
