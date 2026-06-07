'use client';

/**
 * [LAYER: UI]
 */
import Link from 'next/link';
import { Handshake, Sparkles, Star, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { STORE_PATHS } from '@utils/navigation';
import { SITE_FOOTER_CLOSER } from '@utils/seo';
import { WOODBINE_BRAND } from '@domain/seo/brand';
import { WOODBINE_LOCAL_BUSINESS_DEFAULTS } from '@domain/seo/local-business-defaults';
import { FooterNewsletter } from './FooterNewsletter';
import './footer.css';
import './footer-contact.css';

const FOOTER_ADDRESS = {
  street: WOODBINE_LOCAL_BUSINESS_DEFAULTS.street,
  cityLine: `${WOODBINE_LOCAL_BUSINESS_DEFAULTS.city}, Utah ${WOODBINE_LOCAL_BUSINESS_DEFAULTS.postal}`,
  mapsQuery: `${WOODBINE_LOCAL_BUSINESS_DEFAULTS.street}, ${WOODBINE_LOCAL_BUSINESS_DEFAULTS.city}, UT ${WOODBINE_LOCAL_BUSINESS_DEFAULTS.postal}`,
} as const;

const HIGHLIGHTS: ReadonlyArray<{
  icon: typeof Users;
  title: string;
  copy: string;
  iconClass?: string;
}> = [
  {
    icon: Users,
    title: 'Pull Up a Chair',
    copy: 'First visit or your regular corner',
  },
  {
    icon: Handshake,
    title: 'Nine Kitchens',
    copy: 'Independent counters, Salt Lake roots',
  },
  {
    icon: Sparkles,
    title: 'The Warehouse Room',
    copy: 'Communal tables under one barrel roof',
    iconClass: 'is-accent-green',
  },
  {
    icon: Star,
    title: 'Built to Linger',
    copy: 'Coffee at dawn to nightcaps after dark',
    iconClass: 'is-accent-star',
  },
];

const NAV_GROUPS = [
  {
    label: 'Visit',
    links: [
      { href: STORE_PATHS.PRODUCTS, label: 'Vendors & Menu', title: 'Browse vendors and menu' },
      { href: '/collections/artist-cards', label: 'Full Plates', title: 'Full plates and sandos' },
      { href: '/collections/prints', label: 'Cold Drinks', title: 'Cold drinks and bar' },
      { href: '/collections/accessories', label: 'Coffee & Work', title: 'Coffee and work-friendly spots' },
    ],
  },
  {
    label: 'Community',
    links: [
      { href: '/blog', label: 'Stories from the Hall' },
      { href: '/support', label: 'Visit & Connect' },
      { href: '/support?contact=true', label: 'Private Events' },
    ],
  },
  {
    label: 'Account',
    links: [
      { href: '/login', label: 'Sign In' },
      { href: '/orders', label: 'Order History' },
      { href: '/orders', label: 'Track Your Order' },
      { href: '/support', label: 'Support Center' },
    ],
  },
] as const;

export function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="site-footer">
      <div className="site-footer__curtain" aria-hidden="true" />
      <div className="site-footer__rail" aria-hidden="true" />

      <div className="site-footer__inner">
        <div className="site-footer__upper">
          <section className="site-footer__section" aria-label="WoodBine at a glance">
            <div className="site-footer__highlights">
              {HIGHLIGHTS.map(({ icon: Icon, title, copy, iconClass }) => (
                <article key={title} className="site-footer__highlight">
                  <Icon className={iconClass ?? undefined} aria-hidden="true" />
                  <p className="site-footer__highlight-title">{title}</p>
                  <p className="site-footer__highlight-copy">{copy}</p>
                </article>
              ))}
            </div>
          </section>

          <hr className="site-footer__rule site-footer__rule--light" />

          <section className="site-footer__section site-footer__main">
          <div className="site-footer__contact-panel">
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
          </div>

          <div className="site-footer__main-divider" aria-hidden="true" />

          <nav className="site-footer__nav" aria-label="Footer">
            {NAV_GROUPS.map(({ label, links }) => (
              <div key={label} className="site-footer__nav-col">
                <h3 className="site-footer__nav-label">{label}</h3>
                <ul className="site-footer__nav-list">
                  {links.map((link) => (
                    <li key={`${label}-${link.label}`}>
                      <Link href={link.href} title={'title' in link ? link.title : undefined} className="site-footer__nav-link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </section>
        </div>

        <hr className="site-footer__rule site-footer__rule--subtle" />

        <div className="site-footer__newsletter">
          <FooterNewsletter />
        </div>

        <hr className="site-footer__rule site-footer__rule--subtle" />

        <div className="site-footer__legal">
          <p className="site-footer__copyright">© {currentYear || 2026} WoodBine. All Rights Reserved.</p>
          <p className="site-footer__closer">{SITE_FOOTER_CLOSER}</p>
        </div>
      </div>
    </footer>
  );
}
