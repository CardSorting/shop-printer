/**
 * Landing page copy — pass IV agency voice.
 * Cinematic. Declarative. Zero filler.
 */

export const LANDING_META = {
  project: 'WoodBine',
  discipline: 'Gather · Dine · Belong',
  location: 'Salt Lake City',
  year: '2024',
  case: 'Case Study № 01',
} as const;

export const LANDING_SECTIONS = [
  { id: 'landing-hero', index: '00', label: 'Open' },
  { id: 'landing-story', index: '01', label: 'Theory' },
  { id: 'landing-editorial', index: '02', label: 'Interlude' },
  { id: 'landing-voices', index: '03', label: 'Record' },
  { id: 'landing-vendors', index: '04', label: 'Line' },
  { id: 'landing-menu', index: '05', label: 'Service' },
  { id: 'landing-visit', index: '06', label: 'Close' },
] as const;

export const LANDING_COPY = {
  hero: {
    coords: '40.7608° N · 111.8910° W',
    brief: LANDING_META,
    kicker: 'Case Study № 01 — Salt Lake Warehouse District',
    headline: ['The city’s', 'communal table.'],
    lede:
      'One barrel roof. A dozen independent kitchens. A warehouse floor converted into the rarest thing in dining — a room that refuses to hurry you out.',
    aside: 'Walk in. Sit down. The room handles the rest.',
    collage: {
      volume: 'Archive — Plate 001',
      quote: 'Space follows appetite. Appetite follows company.',
    },
    scroll: 'Begin',
    cta: {
      primary: { label: 'Step inside', href: '/products' },
      secondary: { label: 'Orient yourself', href: '/support' },
    },
  },

  marquee: {
    forward: [
      'Always Open',
      'Vendor-Owned',
      'All Ages',
      'Shared Tables',
      'Barrel Roof',
      'Stay Longer',
    ],
    reverse: [
      'Salt Lake · Utah',
      'Warehouse Reborn',
      'No Turn Policy',
      'Patio & Ping Pong',
      'Coffee Till Late',
      'Built to Return',
    ],
  },

  story: {
    index: '01',
    label: 'Theory',
    headline: ['We didn’t design a hall.', 'We preserved a habit.'],
    body:
      'WoodBine is what happens when you strip away the franchise playbook and leave only what matters — visible kitchens, honest portions, and a floor plan that forces every guest to face the same center of gravity.',
    pullquote: 'A seat here isn’t assigned. It’s implied.',
    figureCaption: 'Radial layout. Central sightline. Peripheral belonging.',
    pillars: [
      {
        index: '01',
        kicker: 'Pattern',
        title: 'Return becomes ritual',
        body: 'Same hour. Same counter. Same nod from the line cook. Repetition here isn’t boredom — it’s the room’s highest compliment.',
      },
      {
        index: '02',
        kicker: 'Transparency',
        title: 'Kitchens without walls',
        body: 'Every vendor works in the open. You see the hands that feed you. They see the faces they cook for. That’s the whole contract.',
      },
      {
        index: '03',
        kicker: 'Access',
        title: 'No briefing required',
        body: 'First visit? Choose any counter. Any seat. The room calibrates — through steam, sound, and whoever sits down next.',
      },
    ],
  },

  editorial: {
    kicker: '02 — Interlude',
    quote: 'Space follows appetite.',
    sub: 'We drew the floor so every stool points inward — because the meal is only half the architecture.',
    cta: { label: 'Study the layout', href: '/support' },
  },

  voices: {
    index: '03',
    label: 'Record',
    headline: ['Evidence,', 'not marketing.'],
    featured: {
      quote:
        'One order became an afternoon. One table became a crew. I stopped calling it a food hall and started calling it mine.',
      role: 'Month one · Corner regular',
    },
    cards: [
      {
        quote: 'You cook differently when you know who’s eating.',
        role: 'Pass · Vendor',
      },
      {
        quote: 'They never brought the check. We never asked. That’s the whole review.',
        role: 'Midday · Crew of four',
      },
      {
        quote: 'He got cornhole. I got names. Neither of us left empty.',
        role: 'Sunday · Family table',
      },
    ],
  },

  vendors: {
    index: '04',
    label: 'Line',
    headline: ['Autonomous kitchens.', 'Shared gravity.'],
    lede: 'Twelve menus. Twelve owners. One floor that pulls every plate toward the same center.',
    cta: { label: 'Walk the line', href: '/collections/all' },
    tiles: [
      { title: 'Forge', sub: 'Heat · Depth · Stay' },
      { title: 'Drift', sub: 'Cold · Social · Golden' },
      { title: 'Study', sub: 'Espresso · Focus · Linger' },
    ],
  },

  menu: {
    index: '05',
    label: 'Service',
    headline: ['Live service.', 'Right now.'],
    lede: 'What’s leaving the pass at this hour — the dishes that built the room’s reputation plate by plate.',
    spotlight: 'Pass selection',
    cta: { label: 'Open the pass', href: '/collections/all' },
    loadMore: 'Continue down the line',
    loading: 'At the pass…',
  },

  visit: {
    index: '06',
    label: 'Close',
    headline: ['You’re', 'expected.'],
    lede:
      'Tournaments from birthday dinners. Alliances from lunch breaks. Habits from one unplanned afternoon. WoodBine rewards showing up over planning.',
    sub: 'Eat. Stay. Return. The architecture supports all three.',
    stats: [
      { label: 'Return', sub: 'They saved your spot' },
      { label: 'Arrive', sub: 'Door’s unlocked' },
      { label: 'Host', sub: 'Buy the room out' },
    ],
    card: {
      kicker: 'Final frame — Directions',
      title: 'No RSVP required.',
      body: 'Hours, vendors, events, parking, and the exact coordinates to find us. Everything between curiosity and your first plate.',
      cta: { label: 'Just come', href: '/support' },
    },
  },
} as const;

export const LANDING_SEO_HEADLINE =
  'WoodBine — Salt Lake City’s communal food hall in a restored warehouse';
