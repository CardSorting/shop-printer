/**
 * Landing page copy — world-class food hall voice.
 * Warm, sensory, practical. Built for guests, not portfolios.
 */

export const LANDING_META = {
  name: 'WoodBine',
  tagline: 'Old Hall. New Flavors.',
  neighborhood: 'Warehouse District · Salt Lake City',
  vendorCount: 9,
} as const;

export const LANDING_SECTIONS = [
  { id: 'landing-hero', label: 'Welcome', shortLabel: 'Home', hint: 'Start here' },
  { id: 'landing-vendors', label: 'Counters', shortLabel: 'Menu', hint: 'Nine kitchens' },
  { id: 'landing-visit', label: 'Visit us', shortLabel: 'Visit', hint: 'Walk in anytime' },
  { id: 'landing-gatherings', label: 'Private events', shortLabel: 'Events', hint: 'Book the room' },
  { id: 'landing-beyond', label: 'The space', shortLabel: 'Space', hint: 'Beyond the line' },
  { id: 'landing-directions', label: 'Directions', shortLabel: 'Map', hint: 'Pull in' },
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
    headline: ['Nine kitchens.', 'One big table.'],
    lede:
      'Open flames, shared seating, and a restored warehouse built for the meal that becomes an afternoon — espresso at dawn to nightcaps under the barrel roof.',
    aside: 'No host stand. No turn time. Pull up a chair.',
    collage: {
      volume: 'On the floor today',
      quote: 'Three counters. One table. Stay until the patio lights come on.',
    },
    scroll: 'Walk the hall',
    cta: {
      primary: { label: 'See the counters', href: '#landing-vendors' },
      secondary: { label: 'Hours & directions', href: '#landing-visit' },
    },
    byDaypart: {
      morning: {
        lede:
          'Warm cookies, fresh slices, and quiet tables before the rush — nine kitchens waking up along one wall.',
        aside: 'Chunky for something sweet. Mozz from the oven. Stay as long as you want.',
        ctaPrimary: { label: 'Morning menu', href: '/collections/coffee' },
        collageQuote: 'Pastry first. Espresso second. The floor is yours until noon.',
      },
      midday: {
        lede:
          'Every counter firing — steam from the pass, shared plates, and the buzz of a room built for mixing menus.',
        aside: 'No host stand. No turn time. Pull up a chair.',
        ctaPrimary: { label: 'Order lunch', href: '/collections/bestsellers' },
        collageQuote: 'Arepas from Caracas. Smoke from Salt City. One table for all of it.',
      },
      afternoon: {
        lede:
          'Second round from Chunky, a slice from Mozz, laptop corners in the slow middle of the day — the hall quiets without emptying out.',
        aside: 'Marcato stromboli. DeadPan sando. Nobody clocks your table.',
        ctaPrimary: { label: 'Afternoon menu', href: '/collections/bestsellers' },
        collageQuote: 'The rush is over. The room is yours for a slow round.',
      },
      evening: {
        lede:
          'Patio lights, shared mains, smoke from Salt City Barbecue, slices from Mozz — dinner as a room, not a reservation.',
        aside: 'Walk in. Mix counters. Stay for one more round.',
        ctaPrimary: { label: 'Dinner menu', href: '/collections/hearty' },
        collageQuote: 'Cocktails, shared plates, warehouse lit up after dark.',
      },
      late: {
        lede:
          'Final bowls from Tosh\'s, burgers from Doms, cookies from Chunky if you\'re lucky — the hall winding down together.',
        aside: 'Last-call energy. Same communal tables. One more round if you\'re quick.',
        ctaPrimary: { label: 'Late menu', href: '/collections/bestsellers' },
        collageQuote: 'Tonkotsu, nightcaps, the room going quiet by degrees.',
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
    headline: 'Nine kitchens along one wall.',
    hint: 'Scroll the counter line — order at any window, mix plates at one table.',
    footer: 'Every counter is its own restaurant · Same room · Same buzz',
  },

  daypart: {
    morning: {
      greeting: 'Morning on the floor',
      hint: 'Espresso, pastry, and quiet tables before the rush.',
      suggestion: 'Chunky for cookies · Mozz for a slice',
    },
    midday: {
      greeting: 'Lunch rush energy',
      hint: 'Steam from the pass, shared plates, every counter firing.',
      suggestion: 'Arepas from Caracas · ramen from Tosh\'s · same table',
    },
    afternoon: {
      greeting: 'Slow afternoon',
      hint: 'Cookies, slices, laptop-friendly corners — the hall in low gear.',
      suggestion: 'Marcato stromboli · DeadPan sando · slow table',
    },
    evening: {
      greeting: 'Evening in the hall',
      hint: 'Patio lights, shared mains, smoke from the pass, one more round.',
      suggestion: 'Salt City Barbecue for smoke · Mozz for a pie',
    },
    late: {
      greeting: 'Last call',
      hint: 'Final plates, nightcaps, the room winding down together.',
      suggestion: "Tosh's tonkotsu · Doms smash · whatever's still firing",
    },
  },

  nowBoard: {
    openLabel: 'Live on the floor',
    closedLabel: 'Hall is closed',
    morning: {
      title: 'Pastry steam & first espresso',
      energy: 'Quiet · unhurried',
      hotCounters: ['Chunky', 'Mozz', 'Marcato'],
      cta: { label: 'See morning menu', href: '/collections/coffee' },
    },
    midday: {
      title: 'Every counter is firing',
      energy: 'Full buzz · shared tables',
      hotCounters: ['Caracas Grill', 'Salt City Barbecue', 'Doms Burgers'],
      cta: { label: 'Order lunch', href: '/collections/bestsellers' },
    },
    afternoon: {
      title: 'Second-round weather',
      energy: 'Relaxed · laptop-friendly',
      hotCounters: ['Mozz', 'DeadPan', 'Chunky'],
      cta: { label: 'Browse afternoon', href: '/collections/bestsellers' },
    },
    evening: {
      title: 'Patio lights & shared plates',
      energy: 'Social · slow dinner',
      hotCounters: ['Salt City Barbecue', 'Mozz', 'Shwe Letyar'],
      cta: { label: 'See dinner menu', href: '/collections/hearty' },
    },
    late: {
      title: 'Final plates & nightcaps',
      energy: 'Winding down together',
      hotCounters: ["Tosh's Ramen Express", 'Doms Burgers', 'Chunky'],
      cta: { label: 'Last call menu', href: '/collections/bestsellers' },
    },
  },

  gettingHere: {
    label: 'Getting here',
    headline: 'Pull into the warehouse district.',
    sub: 'Street parking on 500 W · rideshare to the front door · look up for the barrel roof.',
    aside: 'Main entrance faces 500 W — follow the kitchen smoke.',
    stamp: 'SLC · Warehouse District',
    routeKicker: 'Route sheet',
    marginNote: '≈ 5 min from downtown',
    mapCaption: '235 S 500 W · tap for full map',
    address: { label: 'Address' },
    parking: {
      label: 'Parking',
      detail: 'Street parking on 500 W and surrounding blocks · rideshare drop-off at the front door.',
    },
    arrival: {
      label: 'First time?',
      detail: 'Look for the barrel roof and open-kitchen smoke — main entrance faces 500 W.',
    },
    mapsCta: 'Open in Google Maps',
    directionsLabel: 'Get directions',
  },

  pulse: {
    menu: { label: 'Order food', href: '/collections/bestsellers' },
    vendors: { label: 'All counters', href: '#landing-vendors' },
    visit: { label: 'Hours & info', href: '#landing-visit' },
    events: { label: 'Private events', href: '#landing-gatherings' },
    directions: { label: 'Directions', href: '#landing-directions' },
  },

  tickerUnit: 'through the hall',

  marquee: {
    forward: [
      'Walk Right In',
      '9 Open Kitchens',
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
    headline: 'Built for a long afternoon.',
  },

  cravings: {
    label: 'Start here',
    headline: 'What sounds good right now?',
    sub: 'Pick a mood — we’ll point you to the right counter.',
  },

  stats: {
    label: 'The hall by the numbers',
  },

  combos: {
    label: 'Regular routes',
    headline: 'How locals plate a visit.',
    sub: 'Three counters, one table, zero rules — copy a round or build your own.',
    cta: 'Build your order',
  },

  beyond: {
    index: '07',
    label: 'Beyond the counters',
    stamp: 'After dark',
    headline: ['More than', 'a food hall.'],
    sub: 'The barrel roof runs lunch rush at noon and a full room by nine.',
    aside: 'Same floor · different energy every night.',
    timelineStart: 'Noon rush',
    timelineMid: 'Evening',
    timelineEnd: 'Full room',
    programLabel: 'Room program',
    programLive: 'Open to bookings',
    stats: [
      { value: '9', label: 'Counters by day' },
      { value: '1', label: 'Barrel roof' },
      { value: '∞', label: 'Nights possible' },
    ],
    footNote: 'Your crowd · your night · our room',
    imageCaption: '235 S 500 W · Warehouse District',
    imageChips: ['Live music', 'Private buyouts', 'Pop-ups'],
    calendar: { label: 'See what’s on', href: '/blog' },
    host: { label: 'Book the hall', href: '/support?contact=true' },
  },

  closing: {
    headline: 'The table’s set.',
    sub: 'Walk in, mix counters, stay longer than you planned — that’s the whole WoodBine ritual.',
    primary: { label: 'Browse hall favorites', href: '/collections/bestsellers' },
    secondary: { label: 'Plan your visit', href: '#landing-visit' },
  },

  hallNews: {
    label: 'On the bulletin',
    headline: 'This week on the floor.',
    cta: 'All hall news',
    ctaHref: '/blog',
    empty: 'Fresh updates from the pass — check back soon.',
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
    sub: 'Shared table, birthday crew, or the whole hall after dark — pick your scale.',
    aside: 'Same room · your crowd · your night',
    stamp: 'Private events',
    footNote: 'Team lunch to after-hours buyout',
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
      'Walk the counter line. Read every menu. Grab a drink on the way to your seat. WoodBine is built so you never need permission — only an appetite and however long you want to stay.',
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
        body: 'Nine counters, nine menus. BBQ, pizza, ramen, sushi, cookies — order from as many as you want.',
      },
      {
        step: '02',
        title: 'Claim a spot',
        body: 'Communal tables, bar seats, patio, quiet corners. Walk in daily — sit where the energy feels right.',
      },
      {
        step: '03',
        title: 'Stay for the room',
        body: 'Dessert from another counter. A second round outside. Cornhole between courses. Nobody rushes you out.',
      },
    ],
    pillars: [
      {
        index: '01',
        kicker: 'Morning',
        title: 'Coffee & pastry crawl',
        body: 'Chunky for something sweet. Mozz for a slice. Laptop tables before the floor fills up.',
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
    sub: 'Char from the grill, citrus from the raw bar, bread from the oven — the hall announces itself the moment you walk in.',
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
        'Quick lunch became a three-hour lap — arepas, then sushi, then warm cookies. We know every counter by name now. Thursdays are ours.',
      role: 'Communal table · Weekly crew',
    },
    cards: [
      {
        quote: 'I plate it different when I can see who’s waiting.',
        role: 'Pass · Salt City Barbecue',
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
    label: 'The hall',
    rail: 'Nine kitchens · one room',
    headline: ['One hall,', 'every craving.'],
    lede:
      'Shared tables, open seating, and a warehouse floor built for grazing — pizza, smoke, ramen, and cookies from the same room.',
    directoryLabel: 'On the floor',
    directoryHint: 'Nine kitchens · walk in · mix menus at one table',
    cta: { label: 'Walk the hall', href: '/collections/bestsellers' },
    tiles: [
      { title: 'Mozz', sub: 'Pizza · Slices · Share' },
      { title: 'Salt City Barbecue', sub: 'Smoke · Char · Plates' },
      { title: 'Caracas Grill', sub: 'Arepas · Street · Bright' },
    ],
  },

  menu: {
    index: '05',
    label: 'Menu',
    headline: ['On the pass', 'now.'],
    lede:
      'What regulars order on repeat — add to cart, pay online, pick up at any counter when you arrive.',
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
    stamp: 'Walk in · no reservation',
    marginNote: 'See you at the door',
    coords: '235 S 500 W · SLC',
    headline: ['The door’s', 'unlocked.'],
    lede:
      'Lunch crews from downtown. Birthday tables passing plates. First dates over ramen and slices — Salt Lake eats together here.',
    sub: 'Walk-ins every day. Buy out the hall when your crowd needs the whole room.',
    aside: 'All ages on the floor · patio open · stay until close.',
    stats: [
      { label: 'Walk in', sub: 'Any counter · any seat' },
      { label: 'Linger', sub: 'Patio · cornhole · dessert round two' },
      { label: 'Return', sub: 'They’ll know your order' },
    ],
    card: {
      kicker: 'Plan your visit',
      title: 'Pull up to the warehouse.',
      body: 'Street parking on 500 W, daily hours, all nine kitchens, and a first-timer guide — everything from pull-up to first bite.',
      cta: { label: 'Hours & directions', href: '#landing-directions' },
    },
  },
} as const;

export const LANDING_SEO_HEADLINE =
  'WoodBine — Salt Lake City’s neighborhood food hall in a restored warehouse on 500 West';
