'use client';

/**
 * [LAYER: UI]
 */
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { STORE_PATHS } from '@utils/navigation';
import { SITE_FOOTER_CLOSER } from '@utils/seo';
import { WOODBINE_BRAND } from '@domain/seo/brand';
import { WOODBINE_LOCAL_BUSINESS_DEFAULTS } from '@domain/seo/local-business-defaults';
import { WoodbineLogo } from '../components/Logo';
import { FooterNewsletter } from './FooterNewsletter';
import './footer.css';
import './footer-contact.css';

const FOOTER_ADDRESS = {
  line: `${WOODBINE_LOCAL_BUSINESS_DEFAULTS.street}, ${WOODBINE_LOCAL_BUSINESS_DEFAULTS.city}, UT ${WOODBINE_LOCAL_BUSINESS_DEFAULTS.postal}`,
  mapsQuery: `${WOODBINE_LOCAL_BUSINESS_DEFAULTS.street}, ${WOODBINE_LOCAL_BUSINESS_DEFAULTS.city}, UT ${WOODBINE_LOCAL_BUSINESS_DEFAULTS.postal}`,
} as const;

const FOOTER_NAV = [
  {
    label: 'Explore',
    links: [
      { href: STORE_PATHS.MENU, label: 'Menu' },
      { href: '/blog', label: 'Stories' },
    ],
  },
  {
    label: 'Visit',
    links: [
      { href: '/support', label: 'Hours & directions' },
      { href: '/support?contact=true', label: 'Private events' },
    ],
  },
  {
    label: 'Account',
    links: [
      { href: STORE_PATHS.LOGIN, label: 'Sign in' },
      { href: '/orders', label: 'Orders' },
      { href: '/support', label: 'Help' },
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
          <section className="site-footer__section site-footer__main site-footer__main--compact" aria-label="WoodBine">
            <div className="site-footer__brand">
              <Link href={STORE_PATHS.HOME} rel="home" title="WoodBine Home" className="footer-contact__logo-link">
                <WoodbineLogo className="footer-contact__logo h-auto" sizes="(max-width: 768px) 280px, 360px" />
              </Link>

              <address className="footer-contact footer-contact--compact not-italic">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(FOOTER_ADDRESS.mapsQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-contact__address-line"
                >
                  {FOOTER_ADDRESS.line}
                </a>
                <a href={`mailto:${WOODBINE_BRAND.email}`} className="footer-contact__email">
                  {WOODBINE_BRAND.email}
                </a>
              </address>
            </div>

            <div className="site-footer__main-divider" aria-hidden="true" />

            <nav className="site-footer__nav site-footer__nav--compact" aria-label="Footer navigation">
              {FOOTER_NAV.map(({ label, links }) => (
                <div key={label} className="site-footer__nav-col">
                  <h3 className="site-footer__nav-label">{label}</h3>
                  <ul className="site-footer__nav-list">
                    {links.map((link) => (
                      <li key={link.label}>
                        <Link href={link.href} className="site-footer__nav-link">
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
