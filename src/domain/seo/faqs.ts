/**
 * [LAYER: DOMAIN — SEO]
 * Visit-page FAQ corpus — shared by UI and FAQPage structured data.
 */

import type { FaqEntry } from './types';

export function buildVisitFaqs(neighborhood: string): readonly FaqEntry[] {
  return [
    {
      question: 'Do I need a reservation?',
      answer:
        'No reservations needed—WoodBine is walk-in welcome. Pull up a chair whenever the room is open.',
    },
    {
      question: 'Can I host a private event?',
      answer:
        'Yes. WoodBine hosts private gatherings scaled to your group—from casual crew dinners to full-room celebrations under the barrel roof.',
    },
    {
      question: 'Is WoodBine good for solo visits?',
      answer:
        'Absolutely. Many regulars started solo—with a laptop, a coffee, or just a plate and a seat by the window. The hall is built for belonging, not just groups.',
    },
    {
      question: 'Where is WoodBine in Salt Lake City?',
      answer: `WoodBine sits in the ${neighborhood}—a restored warehouse built for lingering, not rushing through.`,
    },
    {
      question: 'What makes WoodBine different from a regular restaurant?',
      answer:
        'Independent vendor counters share one room under a barrel roof—so you can mix flavors, meet neighbors, and stay as long as the conversation lasts.',
    },
    {
      question: 'Can I work from WoodBine with a laptop?',
      answer:
        'Yes. Many regulars settle in with coffee, a plate, and a laptop—the hall is built for lingering, not clock-watching.',
    },
  ];
}
