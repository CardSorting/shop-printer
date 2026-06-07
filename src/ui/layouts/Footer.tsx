'use client';

/**
 * [LAYER: UI]
 */
import Link from 'next/link';
import { 
  Users, 
  Handshake,
  Sparkles,
  Star,
  ArrowRight,
  Headset,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { STORE_PATHS } from '@utils/navigation';
import { SITE_BELONGING_LINE, SITE_COMMUNITY_LINE, SITE_GATHERING_LINE, SITE_TAGLINE } from '@utils/seo';
import { WOODBINE_BRAND } from '@domain/seo/brand';
import { WOODBINE_LOCAL_BUSINESS_DEFAULTS } from '@domain/seo/local-business-defaults';
import { FooterNewsletter } from './FooterNewsletter';
import './footer-contact.css';

const FOOTER_ADDRESS = {
  street: WOODBINE_LOCAL_BUSINESS_DEFAULTS.street,
  cityLine: `${WOODBINE_LOCAL_BUSINESS_DEFAULTS.city}, Utah ${WOODBINE_LOCAL_BUSINESS_DEFAULTS.postal}`,
  mapsQuery: `${WOODBINE_LOCAL_BUSINESS_DEFAULTS.street}, ${WOODBINE_LOCAL_BUSINESS_DEFAULTS.city}, UT ${WOODBINE_LOCAL_BUSINESS_DEFAULTS.postal}`,
} as const;


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
            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">Pull Up a Chair</p>
            <p className="text-xs text-gray-500 mt-1">First visit or your regular corner</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-primary-100 transition-colors">
            <Handshake className="w-6 h-6 text-primary-600 mb-2" />
            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">Twelve Kitchens</p>
            <p className="text-xs text-gray-500 mt-1">Independent counters, Salt Lake roots</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-primary-100 transition-colors">
            <Sparkles className="w-6 h-6 text-green-600 mb-2" />
            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">The Warehouse Room</p>
            <p className="text-xs text-gray-500 mt-1">Communal tables under one barrel roof</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-primary-100 transition-colors">
            <Star className="w-6 h-6 text-amber-500 mb-2 fill-amber-500" />
            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">Built to Linger</p>
            <p className="text-xs text-gray-500 mt-1">Coffee at dawn to nightcaps after dark</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-20">
          {/* Brand and Description */}
          <div className="lg:col-span-4 space-y-8">
            <div className="space-y-6">
              <address className="footer-contact not-italic">
                <p className="footer-contact__heading">{WOODBINE_BRAND.legalName}</p>
                <p className="footer-contact__address">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(FOOTER_ADDRESS.mapsQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {FOOTER_ADDRESS.street}
                    <br />
                    {FOOTER_ADDRESS.cityLine}
                  </a>
                </p>
                <Link href={STORE_PATHS.HOME} rel="home" title="WoodBine Home" className="footer-contact__logo-link">
                  <img
                    src={WOODBINE_BRAND.logoGif}
                    alt="Woodbine Food Hall"
                    className="footer-contact__logo"
                    width={120}
                    height={120}
                  />
                </Link>
                <a href={`mailto:${WOODBINE_BRAND.email}`} className="footer-contact__email">
                  {WOODBINE_BRAND.email}
                </a>
              </address>

              <p className="text-gray-500 text-base leading-relaxed">
                <span className="font-semibold text-gray-700">{SITE_TAGLINE}</span> {SITE_GATHERING_LINE}{' '}
                {SITE_COMMUNITY_LINE} {SITE_BELONGING_LINE}
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



        <FooterNewsletter />

        {/* Bottom Utility Bar */}
        <div className="pt-10 border-t border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center lg:text-left">
            © {currentYear || 2026} WoodBine. All Rights Reserved.
          </p>

          <p className="text-[10px] font-bold text-primary-500 uppercase tracking-tighter text-center lg:text-right">
            {SITE_GATHERING_LINE}
          </p>
        </div>
      </div>
    </footer>
  );
}
