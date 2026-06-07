'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CalendarHeart,
  ChevronDown,
  CreditCard,
  Globe,
  Lock,
  Mail,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { useServices } from '@ui/hooks/useServices';
import './footer-newsletter.css';

const MOSAIC = [
  {
    src: '/images/landing/counters/counter-salt-city-bbq.png',
    alt: 'Salt City Barbecue counter',
    label: 'Salt City BBQ',
    index: '01',
    cuisine: 'Smoke & fire',
  },
  {
    src: '/images/landing/counters/counter-deadpan.png',
    alt: 'Deadpan Pizza counter',
    label: 'Deadpan Pizza',
    index: '02',
    cuisine: 'Hall sandos',
  },
  {
    src: '/images/landing/food-parallax-gather.png',
    alt: 'Communal tables in the hall',
    label: 'The room',
    index: '03',
    cuisine: 'Communal tables',
  },
] as const;

const PERKS = [
  {
    icon: UtensilsCrossed,
    num: '01',
    label: 'Vendor spotlights',
    detail: 'New counters, signature plates, and who is on the line this week.',
  },
  {
    icon: CalendarHeart,
    num: '02',
    label: 'Community nights',
    detail: 'Trivia, markets, and the gatherings that fill the warehouse room.',
  },
  {
    icon: Sparkles,
    num: '03',
    label: 'Stories from the hall',
    detail: 'Regulars, recipes, and the people behind the barrel roof.',
  },
] as const;

const MARQUEE_COUNTERS = [
  'Mozz',
  'DeadPan',
  'Salt City BBQ',
  "Dom's Burgers",
  "Tosh's Ramen",
  'Shwe Letyar',
  'Chunky',
  'Marcato',
  'Caracas Grill',
] as const;

const REVEAL = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const STAGGER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

export function FooterNewsletter() {
  const services = useServices();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await services.knowledgebaseService.subscribe(email, 'site_footer');
      setSubscribed(true);
    } catch (error) {
      console.error('Newsletter subscription failed', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const motionProps = reduceMotion
    ? {}
    : {
        initial: 'hidden' as const,
        whileInView: 'visible' as const,
        viewport: { once: true, margin: '-40px' },
        variants: STAGGER,
      };

  return (
    <div className="footer-newsletter-wrap">
      <motion.section
        className="footer-newsletter"
        aria-labelledby="footer-newsletter-heading"
        {...motionProps}
      >
        <div className="footer-newsletter__cinema footer-newsletter__cinema--top" aria-hidden="true" />
        <div className="footer-newsletter__cinema footer-newsletter__cinema--bottom" aria-hidden="true" />

        <div className="footer-newsletter__bg" aria-hidden="true">
          <Image
            src="/images/landing/food-parallax-gather.png"
            alt=""
            fill
            sizes="100vw"
            className="footer-newsletter__bg-image"
          />
          <div className="footer-newsletter__bg-scrim" />
          <div className="footer-newsletter__bg-grid" />
          <div className="footer-newsletter__bokeh footer-newsletter__bokeh--a" />
          <div className="footer-newsletter__bokeh footer-newsletter__bokeh--b" />
          <div className="footer-newsletter__grain" />
        </div>

        <div className="footer-newsletter__rail" aria-hidden="true" />

        <div className="footer-newsletter__inner">
          <motion.aside
            className="footer-newsletter__visual"
            aria-hidden="true"
            variants={reduceMotion ? undefined : REVEAL}
          >
            <div className="footer-newsletter__visual-glow" />
            <div className="footer-newsletter__mosaic">
              {MOSAIC.map((item, i) => (
                <div
                  key={item.src}
                  className={`footer-newsletter__photo footer-newsletter__photo--${String.fromCharCode(97 + i)}`}
                >
                  <span className="footer-newsletter__photo-index">{item.index}</span>
                  <Image src={item.src} alt={item.alt} fill sizes="240px" />
                  <div className="footer-newsletter__photo-meta">
                    <span className="footer-newsletter__photo-label">{item.label}</span>
                    <span className="footer-newsletter__photo-cuisine">{item.cuisine}</span>
                  </div>
                  <span className="footer-newsletter__frame-corner footer-newsletter__frame-corner--tl" />
                  <span className="footer-newsletter__frame-corner footer-newsletter__frame-corner--tr" />
                  <span className="footer-newsletter__frame-corner footer-newsletter__frame-corner--bl" />
                  <span className="footer-newsletter__frame-corner footer-newsletter__frame-corner--br" />
                </div>
              ))}
            </div>
            <div className="footer-newsletter__stamp">
              <span>Warehouse District · SLC</span>
              <strong>Nine kitchens</strong>
            </div>
          </motion.aside>

          <div className="footer-newsletter__main">
            <motion.div className="footer-newsletter__mobile-hero" aria-hidden="true" variants={reduceMotion ? undefined : REVEAL}>
              <Image
                src="/images/landing/food-parallax-gather.png"
                alt=""
                fill
                sizes="100vw"
                className="footer-newsletter__mobile-hero-image"
              />
              <div className="footer-newsletter__mobile-hero-scrim" />
              <div className="footer-newsletter__mobile-thumbs">
                {MOSAIC.slice(0, 2).map((item) => (
                  <div key={item.src} className="footer-newsletter__mobile-thumb">
                    <Image src={item.src} alt={item.alt} width={72} height={72} />
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.header className="footer-newsletter__header" variants={reduceMotion ? undefined : REVEAL}>
              <div className="footer-newsletter__header-top">
                <p className="footer-newsletter__label">From the hall</p>
                <span className="footer-newsletter__badge">Weekly digest</span>
              </div>

              <h2 id="footer-newsletter-heading" className="footer-newsletter__headline font-display">
                Join the <em>Neighborhood Table</em>
              </h2>
              <span className="footer-newsletter__rule" aria-hidden="true" />

              <p className="footer-newsletter__copy">
                Vendor spotlights, community nights, and the stories behind the room—so you never miss a reason to come
                back and pull up a chair.
              </p>
            </motion.header>

            <motion.ul className="footer-newsletter__perks" aria-label="What you will receive" variants={reduceMotion ? undefined : REVEAL}>
              {PERKS.map(({ icon: Icon, num, label, detail }) => (
                <li key={num} className="footer-newsletter__perk">
                  <span className="footer-newsletter__perk-num">{num}</span>
                  <span className="footer-newsletter__perk-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <div className="footer-newsletter__perk-copy">
                    <strong>{label}</strong>
                    <span>{detail}</span>
                  </div>
                </li>
              ))}
            </motion.ul>

            <motion.div className="footer-newsletter__form-panel" variants={reduceMotion ? undefined : REVEAL}>
              <p className="footer-newsletter__form-label">Your seat at the table</p>

              {subscribed ? (
                <div className="footer-newsletter__success">
                  <div className="footer-newsletter__success-icon">
                    <Mail aria-hidden="true" />
                  </div>
                  <div>
                    <h3>You&apos;re on the list</h3>
                    <p>
                      Welcome to the neighborhood table. Hall updates, counter news, and community nights—straight to
                      your inbox.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <form className="footer-newsletter__form" onSubmit={handleSubscribe}>
                    <label className="footer-newsletter__field">
                      <span className="sr-only">Email address</span>
                      <Mail aria-hidden="true" />
                      <input
                        id="footer-newsletter-email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                        className="footer-newsletter__input"
                      />
                    </label>
                    <button type="submit" disabled={isSubmitting} className="footer-newsletter__submit">
                      {isSubmitting ? 'Joining…' : 'Subscribe'}
                      {!isSubmitting ? <ArrowRight aria-hidden="true" className="w-4 h-4" /> : null}
                    </button>
                  </form>
                  <p className="footer-newsletter__fine">
                    One email when it matters. Unsubscribe anytime—we&apos;d rather see you at a communal table anyway.
                  </p>
                </>
              )}
            </motion.div>
          </div>
        </div>

        <div className="footer-newsletter__marquee" aria-hidden="true">
          <div className="footer-newsletter__marquee-track">
            {[...MARQUEE_COUNTERS, ...MARQUEE_COUNTERS].map((name, index) => (
              <span key={`${name}-${index}`} className="footer-newsletter__marquee-item">
                {name}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="footer-newsletter__trust">
        <div className="footer-newsletter__locale">
          <Globe aria-hidden="true" className="w-3.5 h-3.5" />
          <span>US / USD</span>
          <ChevronDown aria-hidden="true" className="w-3 h-3 opacity-50" />
        </div>

        <div className="footer-newsletter__payments" aria-label="Accepted payment methods">
          <CreditCard aria-hidden="true" />
          <span className="footer-newsletter__pay-badge footer-newsletter__pay-badge--italic">Mastercard</span>
          <span className="footer-newsletter__pay-badge">PayPal</span>
          <span className="footer-newsletter__pay-badge">Stripe</span>
          <span className="footer-newsletter__secure">
            <Lock aria-hidden="true" className="w-3.5 h-3.5" />
            Secure checkout
          </span>
        </div>
      </div>
    </div>
  );
}
