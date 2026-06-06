/**
 * [LAYER: DOMAIN — SEO]
 * Community narrative blocks for UI and rich-result copy.
 */

export const SITE_COMMUNITY_PROMISE = [
  {
    title: 'Vendors are neighbors',
    body: 'Every counter in the hall is run by someone from this city—cooking for a room, not a corporate playbook.',
  },
  {
    title: 'The door stays open',
    body: 'Walk in when you’re hungry, thirsty, lonely, or celebrating. No reservation required to belong here.',
  },
  {
    title: 'The room remembers you',
    body: 'Come back once or come back every week—the hall is built for relationships that grow over repeated meals.',
  },
] as const;

export const COMMUNITY_RITUALS = [
  {
    title: 'The Tuesday Table',
    body: 'Same crew, same corner, same order—proof that a food hall can feel like a living room.',
  },
  {
    title: 'Patio Hour',
    body: 'Cold beer, covered seats, and the kind of conversations that stretch longer than intended.',
  },
  {
    title: 'Pass the Word',
    body: 'Regulars telling first-timers which vendor to try—that’s how flavor and community spread here.',
  },
  {
    title: 'Ping Pong Diplomacy',
    body: 'Strangers become teammates. Teams become friends. The hall gets louder in the best way.',
  },
] as const;

export const CART_GUEST_TIERS = [
  { minSubtotal: 0, label: 'New to the Room', color: 'text-gray-600', bg: 'bg-gray-50' },
  { minSubtotal: 10000, label: 'Pulling Up a Chair', color: 'text-green-600', bg: 'bg-green-50' },
  { minSubtotal: 25000, label: 'Hall Regular', color: 'text-blue-600', bg: 'bg-blue-50' },
  { minSubtotal: 50000, label: 'Corner Regular', color: 'text-purple-600', bg: 'bg-purple-50' },
] as const;

export const COMMUNITY_PILLARS = [
  {
    title: 'Regulars',
    subtitle: 'Welcome back',
    body: 'The Tuesday lunch crew. The window-seat regular. The person who always orders last and somehow knows everyone’s name.',
  },
  {
    title: 'Vendors',
    subtitle: 'Neighbors at the stove',
    body: 'Independent kitchens rooted in this city—cooking for a room, not a chain. Stop by their counter and stay for the conversation.',
  },
  {
    title: 'First-Timers',
    subtitle: 'Pull up a chair',
    body: 'Never been? Perfect. The hall was built for discovery—grab a plate, find a seat, and let the room do the rest.',
  },
] as const;

export const ROOM_VOICES = [
  {
    quote: 'I came for a sando and stayed three hours. Ended up on a ping pong team I didn’t know I needed.',
    role: 'First-timer turned regular',
  },
  {
    quote: 'We cook for a room full of people we recognize. That’s the whole reason we’re here.',
    role: 'Vendor at the hall',
  },
  {
    quote: 'It’s the only place in the city where my meeting ran long and nobody rushed us out.',
    role: 'Wednesday lunch crew',
  },
  {
    quote: 'My kid learned to play cornhole here. I learned the names of three vendors. Fair trade.',
    role: 'Weekend regular',
  },
  {
    quote: 'We booked our team off-site here because nobody wanted to leave when the meeting ended.',
    role: 'Local business crew',
  },
] as const;

export const COMMUNITY_CHIPS = [
  'No reservations',
  'All ages welcome',
  'Shared tables',
  'Patio & barrel roof',
  'Ping pong & cornhole',
  'Private events',
  'Walk in anytime',
  'Vendor neighbors',
] as const;
