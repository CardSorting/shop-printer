'use client';

/**
 * [LAYER: UI]
 */
import Link from 'next/link';
import { 
  Users, 
  Globe, 
  CreditCard, 
  Handshake,
  Sparkles,
  Star,
  ChevronDown,
  ArrowRight,
  Headset,
  Lock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getProductUrl, getCollectionUrl, STORE_PATHS } from '@utils/navigation';
import { SITE_BELONGING_LINE, SITE_COMMUNITY_LINE, SITE_GATHERING_LINE, SITE_TAGLINE } from '@utils/seo';
import { BeeLogo } from '../components/Logo';


export function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-white pt-24 pb-8 relative overflow-hidden">
      {/* Decorative Gradient Top Border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary-500/30 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust Bar - Social Proof & Security */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          <div className="flex flex-col items-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-primary-100 transition-colors group">
            <Users className="w-6 h-6 text-primary-600 mb-2" />
            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">All Welcome</p>
            <p className="text-xs text-gray-500 mt-1">Regulars &amp; first-timers</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-primary-100 transition-colors">
            <Handshake className="w-6 h-6 text-primary-600 mb-2" />
            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">Local Vendors</p>
            <p className="text-xs text-gray-500 mt-1">Neighbors with a story</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-primary-100 transition-colors">
            <Sparkles className="w-6 h-6 text-green-600 mb-2" />
            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">Shared Space</p>
            <p className="text-xs text-gray-500 mt-1">Historic warehouse room</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-primary-100 transition-colors">
            <Star className="w-6 h-6 text-amber-500 mb-2 fill-amber-500" />
            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">Third Place</p>
            <p className="text-xs text-gray-500 mt-1">Work, linger, belong</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-20">
          {/* Brand and Description */}
          <div className="lg:col-span-4 space-y-8">
            <div className="space-y-4">
              <Link href={STORE_PATHS.HOME} rel="home" title="WoodBine Home" className="flex items-center gap-3 text-primary-700 font-black text-3xl tracking-tighter hover:opacity-80 transition-opacity">
                <BeeLogo className="w-12 h-12" />
                WoodBine
              </Link>
              <p className="text-gray-500 text-base leading-relaxed">
                <span className="font-semibold text-gray-700">{SITE_TAGLINE}</span> {SITE_GATHERING_LINE} {SITE_COMMUNITY_LINE} {SITE_BELONGING_LINE}
              </p>
            </div>
            


            <Link href="/support" title="Contact WoodBine" className="flex items-center gap-3 p-4 bg-primary-600 rounded-2xl text-white shadow-xl shadow-primary-600/20 group hover:bg-primary-700 transition-colors">
              <Headset className="w-6 h-6" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Pull up a chair</p>
                <p className="text-sm font-black">Hours, Events &amp; Questions</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Navigation Groups - Minimalist */}
          <div className="lg:col-span-8 flex flex-wrap justify-start lg:justify-end gap-16">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Visit</h3>
              <ul className="space-y-3">
                <li><Link href={STORE_PATHS.PRODUCTS} title="Browse vendors and menu" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Vendors &amp; Menu</Link></li>
                <li><Link href="/collections/artist-cards" title="Full plates and sandos" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Full Plates</Link></li>
                <li><Link href="/collections/prints" title="Cold drinks and bar" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Cold Drinks</Link></li>
                <li><Link href="/collections/accessories" title="Coffee and work-friendly spots" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Coffee &amp; Work</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Community</h3>
              <ul className="space-y-3">
                <li><Link href="/blog" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Stories from the Hall</Link></li>
                <li><Link href="/support" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Visit &amp; Connect</Link></li>
                <li><Link href="/support?contact=true" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Private Events</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Account</h3>
              <ul className="space-y-3">
                <li><Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Sign In</Link></li>
                <li><Link href="/orders" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Order History</Link></li>
                <li><Link href="/orders" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Track Your Order</Link></li>
                <li><Link href="/support" className="text-sm font-semibold text-gray-600 hover:text-primary-600 transition-colors">Support Center</Link></li>
              </ul>
            </div>
          </div>
        </div>



        {/* Join the Hive Newsletter */}
        <div className="my-20 py-16 px-8 rounded-4xl bg-linear-to-br from-primary-600 to-primary-700 text-white relative overflow-hidden shadow-2xl shadow-primary-500/20">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BeeLogo className="w-64 h-64 rotate-12" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6 leading-none uppercase">Join the Neighborhood Table</h2>
            <p className="text-primary-50 font-medium text-lg mb-10 max-w-lg">
              Vendor spotlights, community nights, and the stories behind the room—so you never miss a reason to come back and pull up a chair.
            </p>
            <form className="flex flex-col sm:flex-row gap-4" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="you@example.com" 
                className="flex-1 px-8 py-5 rounded-2xl bg-white text-gray-900 font-bold placeholder:text-gray-300 focus:outline-hidden focus:ring-4 focus:ring-primary-400 transition-all"
              />
              <button className="px-10 py-5 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Utility Bar */}
        <div className="pt-10 border-t border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex flex-wrap justify-center lg:justify-start gap-x-10 gap-y-4">

            <div className="flex items-center gap-2 text-xs font-bold text-gray-900 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
              <Globe className="w-3 h-3" />
              <span>US / USD</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>
          </div>
          
          <div className="flex items-center gap-8 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
            <CreditCard className="w-8 h-8" />
            <div className="text-[10px] font-black tracking-tighter uppercase italic border border-gray-200 px-2 py-1 rounded">Mastercard</div>
            <div className="text-[10px] font-black tracking-tighter uppercase border border-gray-200 px-2 py-1 rounded">PayPal</div>
            <div className="text-[10px] font-black tracking-tighter uppercase border border-gray-200 px-2 py-1 rounded">Stripe</div>
            <Lock className="w-4 h-4 text-green-600" />
          </div>

          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              © {currentYear || 2026} WoodBine. All Rights Reserved.
            </p>
            <p className="text-[10px] font-bold text-primary-500 mt-1 uppercase tracking-tighter">
              {SITE_GATHERING_LINE}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
