import { DEFAULT_BLOG_IMAGE, DEFAULT_FOOD_HALL_IMAGE } from '@utils/imageFallback';

/** Featured bento tiles — hero counters on the landing page */
export const VENDOR_TILES = [
  {
    href: '/collections/hearty',
    img: DEFAULT_FOOD_HALL_IMAGE,
    span: 'lg:col-span-7 lg:row-span-2',
    aspect: 'aspect-4/5 lg:aspect-auto lg:min-h-[560px]',
    index: '01',
    cuisine: 'Smoke & fire',
  },
  {
    href: '/collections/seasonal',
    img: DEFAULT_BLOG_IMAGE,
    span: 'lg:col-span-5',
    aspect: 'aspect-5/4',
    index: '02',
    cuisine: 'Raw bar & citrus',
  },
  {
    href: '/collections/bestsellers',
    img: DEFAULT_FOOD_HALL_IMAGE,
    span: 'lg:col-span-5',
    aspect: 'aspect-5/4',
    index: '03',
    cuisine: 'Hearth & comfort',
  },
] as const;

/** Full counter lineup — vendors on the WoodBine floor */
export const HALL_COUNTERS = [
  {
    id: '01',
    name: 'Mozz',
    cuisine: 'Pizza',
    signature: 'Wood-fired slices',
    href: '/collections/bestsellers',
    img: '/images/landing/counters/counter-07.png',
    alt: 'Wood-fired pizza from Mozz',
    layout: 'hero',
  },
  {
    id: '02',
    name: 'DeadPan',
    cuisine: 'Sandwiches',
    signature: 'Pressed hall sando',
    href: '/collections/hearty',
    img: '/images/landing/counters/counter-deadpan.png',
    alt: 'Pressed sandwich from DeadPan',
    layout: 'default',
  },
  {
    id: '03',
    name: 'Salt City Barbecue',
    cuisine: 'BBQ',
    signature: 'Smoked plates',
    href: '/collections/hearty',
    img: '/images/landing/counters/counter-salt-city-bbq.png',
    alt: 'Smoked BBQ platter from Salt City Barbecue',
    layout: 'wide',
  },
  {
    id: '04',
    name: 'Doms Burgers',
    cuisine: 'Burgers',
    signature: 'Smash burger',
    href: '/collections/bestsellers',
    img: '/images/landing/counters/counter-doms-burgers.png',
    alt: 'Smash burger from Doms Burgers',
    layout: 'default',
  },
  {
    id: '05',
    name: "Tosh's Ramen Express",
    cuisine: 'Ramen',
    signature: 'Tonkotsu bowl',
    href: '/collections/hearty',
    img: '/images/landing/counters/counter-09.png',
    alt: "Ramen from Tosh's Ramen Express",
    layout: 'tall',
  },
  {
    id: '06',
    name: 'Shwe Letyar',
    cuisine: 'Sushi · Burmese',
    signature: 'Sushi & mohinga',
    href: '/collections/seasonal',
    img: '/images/landing/counters/counter-shwe-letyar.png',
    alt: 'Sushi and Burmese mohinga from Shwe Letyar',
    layout: 'default',
  },
  {
    id: '07',
    name: 'Chunky',
    cuisine: 'Cookies',
    signature: 'Warm cookies',
    href: '/collections/seasonal',
    img: '/images/landing/counters/counter-chunky.png',
    alt: 'Cookies from Chunky',
    layout: 'default',
  },
  {
    id: '08',
    name: 'Marcato',
    cuisine: 'Stromboli',
    signature: 'Pepperoni roll',
    href: '/collections/bestsellers',
    img: '/images/landing/counters/counter-marcato.png',
    alt: 'Pepperoni stromboli from Marcato',
    layout: 'default',
  },
  {
    id: '09',
    name: 'Caracas Grill',
    cuisine: 'Venezuelan street food',
    signature: 'Arepas & empanadas',
    href: '/collections/seasonal',
    img: '/images/landing/counters/counter-caracas.png',
    alt: 'Venezuelan street food from Caracas Grill',
    layout: 'default',
  },
] as const;

export function getCounterHref(name: string): string {
  return HALL_COUNTERS.find((c) => c.name === name)?.href ?? '#landing-vendors';
}

export const HALL_AMENITIES = [
  { id: 'walk-ins', label: 'Walk-ins welcome', detail: 'No reservation needed' },
  { id: 'shared', label: 'Shared seating', detail: 'Communal tables & bar' },
  { id: 'patio', label: 'Covered patio', detail: 'Year-round outdoor' },
  { id: 'games', label: 'Games yard', detail: 'Ping pong & cornhole' },
  { id: 'all-ages', label: 'All ages', detail: 'Families on the floor' },
  { id: 'pickup', label: 'Order ahead', detail: 'Pick up at the hall' },
  { id: 'wifi', label: 'Guest Wi‑Fi', detail: 'Work-friendly mornings' },
  { id: 'events', label: 'Private events', detail: 'After-hours buyouts' },
] as const;

export const HALL_ZONES = [
  { id: 'counters', label: 'The line', description: 'Nine open kitchens along the main wall — order at any counter, mix plates across vendors.' },
  { id: 'communal', label: 'Communal floor', description: 'Long shared tables at the center. Slide in, split dishes, meet whoever sits down next.' },
  { id: 'patio', label: 'Patio & yard', description: 'Covered outdoor seating, cornhole, and the slow-down zone for second rounds.' },
  { id: 'bar', label: 'Bar & lounge', description: 'Cocktails, wine, and espresso — the same room from morning coffee to evening drinks.' },
] as const;

export const MENU_CATEGORIES = [
  { label: 'Hall favorites', href: '/collections/bestsellers' },
  { label: 'Hearty plates', href: '/collections/hearty' },
  { label: 'Coffee & drinks', href: '/collections/coffee' },
  { label: 'Seasonal', href: '/collections/seasonal' },
  { label: 'Full menu', href: '/collections/bestsellers' },
] as const;

/** Mood-based entry points — how guests actually think about food halls */
export const HALL_CRAVINGS = [
  { id: 'hearty', label: 'Something hearty', sub: 'Smoke · bowls · pasta', href: '/collections/hearty' },
  { id: 'light', label: 'Keep it light', sub: 'Salads · crudo · citrus', href: '/collections/seasonal' },
  { id: 'coffee', label: 'Coffee & pastry', sub: 'Espresso · bakes · AM', href: '/collections/coffee' },
  { id: 'drinks', label: 'Drinks & bar', sub: 'Cocktails · wine · beer', href: '/collections/coffee' },
  { id: 'share', label: 'Share with the table', sub: 'Pizza · tacos · plates', href: '/collections/bestsellers' },
  { id: 'sweet', label: 'Something sweet', sub: 'Dessert · affogato', href: '/collections/seasonal' },
] as const;

export const FIRST_VISIT_TIPS = [
  {
    q: 'Can I order from more than one counter?',
    a: 'Yes — that’s the whole point. Grab plates from any kitchen, bring them to one table, and mix freely.',
  },
  {
    q: 'Do I need a reservation?',
    a: 'Everyday visits are walk-in. Communal tables, bar seats, and patio are first-come. Private buyouts are booked separately.',
  },
  {
    q: 'How does order-ahead work?',
    a: 'Add to cart online, pay, and pick up at any open counter when you arrive. No separate app required.',
  },
  {
    q: 'Is the hall kid-friendly?',
    a: 'All ages welcome on the floor. Patio games, shared tables, and counters with options for every appetite.',
  },
] as const;

export const HALL_GATHERINGS = [
  {
    id: 'team',
    step: '01',
    label: 'The team feed',
    scale: '12–50 guests',
    highlights: ['Every counter open', 'Mix menus', 'One tab optional'],
  },
  {
    id: 'birthday',
    step: '02',
    label: 'Mark the occasion',
    scale: '8–25 guests',
    highlights: ['Long shared tables', 'One table for everyone', 'Patio overflow'],
  },
  {
    id: 'buyout',
    step: '03',
    label: 'After-hours buyout',
    scale: 'Whole hall',
    highlights: ['Evening events', 'Pick your vendors', 'Your playlist'],
  },
] as const;

export const HALL_BEYOND_GROUPS = [
  {
    id: 'gather',
    title: 'Gather',
    tagline: 'Tables · toasts · takeovers',
    items: [
      { label: 'Party venue', detail: 'Milestones & full-table nights' },
      { label: 'Jam sesh', detail: 'Open floor · acoustic sets' },
      { label: '& whatever’s next', detail: 'If the room fits, we’re in' },
    ],
  },
  {
    id: 'perform',
    title: 'Perform',
    tagline: 'Music · film · mic nights',
    items: [
      { label: 'Concert hall', detail: 'Live music under the roof' },
      { label: 'Movie nights', detail: 'Screenings on the floor' },
      { label: 'Comedy club', detail: 'Stand-up · variety · mic nights' },
    ],
  },
  {
    id: 'everyday',
    title: 'Everyday',
    tagline: 'Dates · laptops · makers',
    items: [
      { label: 'Date spot', detail: 'Drinks to dessert · no reservation' },
      { label: 'Work space', detail: 'Morning laptop regulars' },
      { label: 'Marketplace', detail: 'Weekend pop-ups & makers' },
    ],
  },
] as const;

export const HALL_STATS = [
  { value: '12', label: 'Open kitchens', detail: 'Independent counters' },
  { value: '0', label: 'Reservations needed', detail: 'Walk in daily' },
  { value: '1', label: 'Pick-up window', detail: 'Order online · collect in hall' },
  { value: '∞', label: 'Counters per visit', detail: 'Mix as many as you want' },
] as const;

/** Curated multi-counter rounds — how regulars actually eat here */
export const HALL_COMBOS = [
  {
    id: 'lunch-lap',
    title: 'The lunch lap',
    subtitle: 'Midday · 3 counters · one table',
    stops: ['Caracas Grill', 'Mozz', 'Chunky'],
    href: '/collections/bestsellers',
  },
  {
    id: 'smoke-sea',
    title: 'Smoke & noodles',
    subtitle: 'Evening share · patio weather',
    stops: ['Salt City Barbecue', 'Shwe Letyar', "Tosh's Ramen Express"],
    href: '/collections/hearty',
  },
  {
    id: 'morning-crawl',
    title: 'The comfort crawl',
    subtitle: 'Burger · sando · slice',
    stops: ['Doms Burgers', 'DeadPan', 'Marcato'],
    href: '/collections/bestsellers',
  },
] as const;

/** Full-bleed food photography bands between visit-flow sections */
export const HALL_FOOD_PARALLAX_FRAMES = [
  {
    id: 'morning',
    index: '01',
    src: '/images/landing/food-parallax-morning.png',
    alt: 'Espresso, pastry, and morning light on the WoodBine counter',
    objectPosition: '50% 38%',
    kicker: 'Morning on the floor',
    caption: 'Pastry steam before the lunch rush.',
    detail: 'Espresso · croissants · the first table',
    align: 'left',
  },
  {
    id: 'pass',
    index: '02',
    src: '/images/landing/food-parallax-pass.png',
    alt: 'Shared plates from multiple counters on a communal table',
    objectPosition: '50% 45%',
    kicker: 'On the pass',
    caption: 'Mix three counters. Eat at one table.',
    detail: 'Small plates · shared middle · one bill',
    align: 'right',
  },
  {
    id: 'gather',
    index: '03',
    src: '/images/landing/food-parallax-gather.png',
    alt: 'Guests sharing plates under the barrel roof at night',
    objectPosition: '50% 42%',
    kicker: 'After dark',
    caption: 'The room fills. The floor opens up.',
    detail: 'Live room · long tables · late service',
    align: 'left',
  },
] as const;
