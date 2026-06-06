import { SupportPage } from '@ui/pages/SupportPage';

export const metadata = {
  title: 'Visit & Connect | WoodBine',
  description: 'Hours, directions, private events, and answers about WoodBine—Salt Lake’s neighborhood table for food, company, and community.',
  alternates: {
    canonical: '/support',
  },
};

import { Suspense } from 'react';

export default function Page() {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do I need a reservation?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No reservations needed—WoodBine is walk-in welcome. Pull up a chair whenever the room is open.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I host a private event?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. WoodBine hosts private gatherings scaled to your group—from casual crew dinners to full-room celebrations under the barrel roof.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is WoodBine good for solo visits?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Absolutely. Many regulars started solo—with a laptop, a coffee, or just a plate and a seat by the window. The hall is built for belonging, not just groups.',
        },
      },
    ],
  };

  const howToLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Make the Most of Your Visit to WoodBine',
    description: 'A quick guide to enjoying WoodBine food hall—vendors, seating, community, and the room.',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Walk In',
        text: 'No reservation required. Come as you are—solo, with coworkers, or with your whole crew.',
        url: 'https://woodbine.com/support#visit-walk-in',
      },
      {
        '@type': 'HowToStep',
        name: 'Explore the Vendors',
        text: 'Browse the hall and pick from independent kitchens—each with their own counter and regulars.',
        url: 'https://woodbine.com/support#visit-vendors',
      },
      {
        '@type': 'HowToStep',
        name: 'Find Your Spot',
        text: 'Grab a seat at the bar, on the patio, or at a shared table. Linger as long as the conversation lasts.',
        url: 'https://woodbine.com/support#visit-seating',
      }
    ],
    totalTime: 'PT5M',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      <Suspense fallback={<div className="min-h-screen animate-pulse bg-gray-50" />}>
        <SupportPage />
      </Suspense>
    </>
  );
}
