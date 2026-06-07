/**
 * Landing page copy — world-class food hall voice.
 * Warm, sensory, practical. Built for guests, not portfolios.
 */

export const LANDING_META = {
  name: 'WoodBine',
  tagline: 'Old Hall. New Flavors.',
  neighborhood: 'Warehouse District · Salt Lake City',
  vendorCount: 12,
} as const;

export const LANDING_SECTIONS = [
  { id: 'landing-hero', label: 'Welcome' },
  { id: 'landing-vendors', label: 'Counters' },
  { id: 'landing-visit', label: 'Visit' },
] as const;

export const LANDING_COPY = {
  hero: {
    coords: '235 S 500 W · Salt Lake City',
    ribbon: {
      statusOpen: 'Open now — walk in',
      statusClosed: 'Closed — opens tomorrow',
      hoursLabel: 'Today',
      vendors: 'Independent counters',
      neighborhood: 'Warehouse District',
    },
    kicker: 'Salt Lake City’s neighborhood food hall',
    headline: ['Twelve kitchens.', 'One big table.'],
    lede:
      'Independent vendors, open flames, shared seating, and a warehouse room built for the kind of meal that turns into an afternoon — coffee at dawn to cocktails after dark.',
    aside: 'No host stand. No turn policy. Just pull up a chair.',
    collage: {
      volume: 'On the floor today',
      quote: 'Order from three counters. Eat at one table. Stay until the patio lights come on.',
    },
    scroll: 'Walk the hall',
    cta: {
      primary: { label: 'See the counters', href: '#landing-vendors' },
      secondary: { label: 'Find us & hours', href: '/support' },
    },
    byDaypart: {
      morning: {
        lede:
          'Espresso steam, warm pastry, and quiet tables before the lunch rush — twelve kitchens waking up along one wall.',
        aside: 'Mainline opens first. Hearth pulls from the oven. Stay as long as you want.',
        ctaPrimary: { label: 'Morning menu', href: '/collections/coffee' },
        collageQuote: 'Pastry counter first. Espresso second. The floor is yours until noon.',
      },
      midday: {
        lede:
          'Every counter firing at once — steam from the pass, shared plates, and the buzz of a room built for mixing menus.',
        aside: 'No host stand. No turn policy. Just pull up a chair.',
        ctaPrimary: { label: 'Order lunch', href: '/collections/bestsellers' },
        collageQuote: 'Order from three counters. Eat at one table. Stay until the patio fills.',
      },
      afternoon: {
        lede:
          'Second coffee, dessert from Crema, laptop-friendly corners — the hall slows down without emptying out.',
        aside: 'Slice Society for a slice. Bar Volta for a spritz. Nobody clocks your table.',
        ctaPrimary: { label: 'Afternoon menu', href: '/collections/bestsellers' },
        collageQuote: 'The rush is over. The room is yours for a slow round.',
      },
      evening: {
        lede:
          'Patio lights, shared mains, smoke from Ember & Oak, and pours from Grain & Grape — dinner as a room, not a reservation.',
        aside: 'Walk in. Mix counters. Stay for nightcaps.',
        ctaPrimary: { label: 'Dinner menu', href: '/collections/hearty' },
        collageQuote: 'Cocktails, shared plates, and the warehouse lit up after dark.',
      },
      late: {
        lede:
          'Final plates from Ramen Post, last pours at Bar Volta, dessert if you’re lucky — the hall winding down together.',
        aside: 'Last call energy. Same communal tables. One more round if you’re quick.',
        ctaPrimary: { label: 'Late menu', href: '/collections/bestsellers' },
        collageQuote: 'Tonkotsu, nightcaps, and the room going quiet by degrees.',
      },
    },
  },

  daypartTimeline: {
    morning: { time: '7–11', label: 'Morning' },
    midday: { time: '11–2', label: 'Lunch rush' },
    afternoon: { time: '2–5', label: 'Slow afternoon' },
    evening: { time: '5–9', label: 'Evening' },
    late: { time: '9+', label: 'Last call' },
  },

  counterLine: {
    label: 'Walk the line',
    headline: 'Twelve kitchens along one wall.',
    hint: 'Scroll the counter line — order from any window, mix plates at one table.',
    footer: 'Every counter is its own restaurant · Same room · Same buzz',
  },

  daypart: {
    morning: {
      greeting: 'Morning on the floor',
      hint: 'Espresso, pastries, and quiet tables before the lunch rush.',
      suggestion: 'Start at Mainline Coffee or Hearth Bakery',
    },
    midday: {
      greeting: 'Lunch rush energy',
      hint: 'Steam from the pass, shared plates, every counter firing.',
      suggestion: 'Mix a bowl from Verde with tacos from Firebird',
    },
    afternoon: {
      greeting: 'Slow afternoon',
      hint: 'Second coffee, dessert from Crema, laptop-friendly corners.',
      suggestion: 'Bar Volta for a spritz · Slice Society for a slice',
    },
    evening: {
      greeting: 'Evening in the hall',
      hint: 'Cocktails, shared mains, patio lights, one more round.',
      suggestion: 'Ember & Oak for smoke · Grain & Grape for pours',
    },
    late: {
      greeting: 'Last call vibes',
      hint: 'Final plates, nightcaps, the room winding down together.',
      suggestion: 'Ramen Post · Bar Volta · whatever’s still on the pass',
    },
  },

  nowBoard: {
    openLabel: 'Live on the floor',
    closedLabel: 'Hall is closed',
    morning: {
      title: 'Pastry steam & first espresso',
      energy: 'Quiet · unhurried',
      hotCounters: ['Mainline Coffee', 'Hearth Bakery', 'Crema'],
      cta: { label: 'See morning menu', href: '/collections/coffee' },
    },
    midday: {
      title: 'Every counter is firing',
      energy: 'Full buzz · shared tables',
      hotCounters: ['Firebird Tacos', 'Ember & Oak', 'The Wok'],
      cta: { label: 'Order lunch now', href: '/collections/bestsellers' },
    },
    afternoon: {
      title: 'Second round weather',
      energy: 'Relaxed · laptop-friendly',
      hotCounters: ['Slice Society', 'Verde', 'Bar Volta'],
      cta: { label: 'Browse afternoon menu', href: '/collections/bestsellers' },
    },
    evening: {
      title: 'Patio lights & shared plates',
      energy: 'Social · slow dinner',
      hotCounters: ['Ember & Oak', 'Grain & Grape', 'Tidal'],
      cta: { label: 'See dinner menu', href: '/collections/hearty' },
    },
    late: {
      title: 'Final plates & nightcaps',
      energy: 'Winding down together',
      hotCounters: ['Ramen Post', 'Bar Volta', 'Crema'],
      cta: { label: 'Last call menu', href: '/collections/bestsellers' },
    },
  },

  gettingHere: {
    label: 'Getting here',
    headline: 'Pull into the warehouse district.',
    address: { label: 'Address' },
    parking: {
      label: 'Parking',
      detail: 'Street parking on 500 W and surrounding blocks · rideshare drop-off at the front door.',
    },
    arrival: {
      label: 'First time?',
      detail: 'Look for the barrel roof and open kitchen smoke — main entrance faces 500 W.',
    },
    mapsCta: 'Open in Google Maps',
  },

  pulse: {
    menu: { label: 'Menu', href: '/collections/bestsellers' },
    vendors: { label: 'All counters', href: '#landing-vendors' },
    line: { label: 'Walk the line', href: '#landing-counter-line' },
    visit: { label: 'Hours & map', href: '/support' },
    events: { label: 'Hall news', href: '/blog' },
  },

  tickerUnit: 'through the hall',

  marquee: {
    forward: [
      'Walk Right In',
      '12 Open Kitchens',
      'Mix Any Counters',
      'Shared Tables',
      'Covered Patio',
      'Stay Until Close',
    ],
    reverse: [
      'Salt Lake · Utah',
      'Historic Warehouse',
      'Coffee to Cocktails',
      'Ping Pong & Cornhole',
      'Order Ahead · Pick Up Here',
      'Private Hall Buyouts',
    ],
  },

  amenities: {
    label: 'On the floor',
    headline: 'Everything you need for a long afternoon.',
  },

  cravings: {
    label: 'Start here',
    headline: 'What sounds good right now?',
    sub: 'Pick a mood — we’ll point you to the right counters.',
  },

  stats: {
    label: 'The hall by the numbers',
  },

  combos: {
    label: 'Regular routes',
    headline: 'How locals plate a visit.',
    sub: 'Three counters, one table, zero rules — copy a round or invent your own.',
    cta: 'Build your order',
  },

  closing: {
    headline: 'The table’s set.',
    sub: 'Walk in, mix counters, stay longer than planned — that’s the whole WoodBine ritual.',
    primary: { label: 'Browse hall favorites', href: '/collections/bestsellers' },
    secondary: { label: 'Plan your visit', href: '/support' },
  },

  hallNews: {
    label: 'On the bulletin',
    headline: 'This week at WoodBine.',
    cta: 'All hall news',
    ctaHref: '/blog',
    empty: 'Fresh updates from the floor — check back soon.',
  },

  firstTimer: {
    label: 'First visit?',
    headline: 'Four things regulars wish they knew on day one.',
  },

  orderDock: {
    order: 'Order',
    counters: 'Counters',
    map: 'Map',
  },

  passStrip: {
    label: 'Moving on the pass',
    sub: 'Add now · pick up when you walk in',
  },

  gatherings: {
    label: 'Gatherings',
    headline: 'Feed twelve or fill the warehouse.',
    sub: 'Pick your scale — shared table, birthday crew, or the whole hall after dark.',
    flowStart: 'Team lunch',
    flowEnd: 'Full buyout',
    cta: { label: 'Plan with us', href: '/support?contact=true' },
  },

  story: {
    index: '01',
    label: 'The Hall',
    rail: 'Guest guide',
    headline: ['Your first lap', 'takes five minutes.'],
    body:
      'Walk the counter line. Read every menu. Grab a drink on the way to your seat. WoodBine is designed so you never need permission — only an appetite and however much time you want to spend.',
    pullquote: 'The hall belongs to whoever shows up — solo with a book, crew of twelve, or somewhere in between.',
    figureCaption: 'Barrel roof · open kitchens · every seat near the action.',
    floorGuide: {
      label: 'Floor guide',
      headline: 'Know the room before you order.',
    },
    howItWorks: [
      {
        step: '01',
        title: 'Walk the line',
        body: 'Twelve counters, twelve menus. Smoked meats, raw bar, pizza, ramen, pastries — order from as many as you want.',
      },
      {
        step: '02',
        title: 'Claim a spot',
        body: 'Communal tables, bar seats, patio, quiet corners. Everyday visits are walk-in — sit where the energy feels right.',
      },
      {
        step: '03',
        title: 'Stay for the room',
        body: 'Dessert from another counter. A second round outside. Ping pong between courses. Nobody rushes you out.',
      },
    ],
    pillars: [
      {
        index: '01',
        kicker: 'Morning',
        title: 'Coffee & pastry crawl',
        body: 'Mainline for espresso, Hearth for something warm. Laptop tables before the floor fills up.',
      },
      {
        index: '02',
        kicker: 'Midday',
        title: 'The pass at full volume',
        body: 'Steam, sizzle, clinking glasses — crews trading bites from four counters at one table.',
      },
      {
        index: '03',
        kicker: 'Evening',
        title: 'Patio & nightcaps',
        body: 'Shared mains, local wine, warehouse lights. The same hall — different hunger.',
      },
    ],
  },

  editorial: {
    kicker: 'Sensory notes',
    quote: 'You smell the smoke before you read the menu.',
    sub: 'Char from the grill, citrus from the raw bar, fresh bread from the oven — the hall announces itself the moment you walk in.',
    cta: { label: 'First visit guide', href: '/support' },
    senses: ['Wood smoke', 'Fresh espresso', 'Griddled bread', 'Citrus & brine', 'Toasting glasses'],
  },

  voices: {
    index: '03',
    label: 'Regulars',
    rail: 'From the floor',
    headline: ['The table', 'next to yours.'],
    featured: {
      quote:
        'Quick lunch became a three-hour tour — tacos, then oysters, then affogato. We know every counter by name now. Thursdays are ours.',
      role: 'Communal table · Weekly crew',
    },
    cards: [
      {
        quote: 'I plate it different when I can see who’s waiting.',
        role: 'Pass · Ember & Oak',
      },
      {
        quote: 'Best morning office in the city — Wi‑Fi, latte, and a sando with actual crunch.',
        role: 'Remote regular · 9 AM',
      },
      {
        quote: 'Kids played cornhole for an hour. We never looked at our phones.',
        role: 'Sunday family · Patio crew',
      },
    ],
  },

  vendors: {
    index: '04',
    label: 'Counters',
    rail: 'The full line · 12 kitchens',
    headline: ['Every counter', 'is its own restaurant.'],
    lede: 'Small kitchens, owner-operated, zero franchise playbook — each vendor brings their own menu to the same room, the same buzz, the same regulars.',
    directoryLabel: 'The full line-up',
    directoryHint: 'Walk any counter · mix plates across the hall',
    cta: { label: 'Browse hall favorites', href: '/collections/bestsellers' },
    tiles: [
      { title: 'Ember & Oak', sub: 'Smoke · Char · Share plates' },
      { title: 'Tidal', sub: 'Oysters · Crudo · Bright' },
      { title: 'Hearth Bakery', sub: 'Bakes · Pastry · Morning' },
    ],
  },

  menu: {
    index: '05',
    label: 'Menu',
    headline: ['On the pass', 'now.'],
    lede:
      "What regulars order on repeat — add to cart, pay online, and pick up at any counter when you arrive.",
    categoriesLabel: 'Browse by craving',
    vendorFilterLabel: 'Filter by counter',
    allCounters: 'All counters',
    emptyVendor: 'Nothing from this counter on the pass right now — try another or browse the full menu.',
    spotlight: 'Regulars’ pick',
    orderHint: 'Order ahead · Pick up in the hall · No app required',
    pickupSteps: ['Browse & add to cart', 'Pay online', 'Pick up at the hall'],
    cta: { label: 'Browse hall favorites', href: '/collections/bestsellers' },
    loadMore: 'More from the line',
    loading: 'At the pass…',
  },

  visit: {
    index: '06',
    label: 'Visit',
    headline: ['The door’s', 'unlocked.'],
    lede:
      'Team lunches, birthday tables, first dates, and neighbors who became regulars — WoodBine is where Salt Lake eats together.',
    sub: 'Walk-ins every day. Private buyouts for your crew. All ages welcome on the floor.',
    stats: [
      { label: 'Walk in', sub: 'Any counter, any seat' },
      { label: 'Linger', sub: 'Patio · games · second round' },
      { label: 'Return', sub: 'They’ll know your order' },
    ],
    card: {
      kicker: 'Plan your visit',
      title: 'Pull up to the warehouse.',
      body: 'Parking, hours, vendor list, and a first-timer guide — everything between here and your first bite.',
      cta: { label: 'Hours & directions', href: '/support' },
    },
  },
} as const;

export const LANDING_SEO_HEADLINE =
  'WoodBine — Salt Lake City’s neighborhood food hall in a restored warehouse';
