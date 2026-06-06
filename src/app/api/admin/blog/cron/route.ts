import { NextResponse } from 'next/server';
import { jsonError, requireConfiguredBearerToken } from '@infrastructure/server/apiGuards';
import { logger } from '@utils/logger';

/**
 * [LAYER: API]
 * Cron Trigger for Blog Automation — WoodBine food hall editorial topics.
 */

const NICHES = [
  {
    id: 'vendor-spotlights',
    name: 'Vendor Spotlights',
    topics: [
      'Meet the Chef Behind WoodBine\'s Newest Counter',
      'Five Dishes You Have to Try at WoodBine This Month',
      'From Food Truck to Food Hall: A Vendor Origin Story',
    ],
  },
  {
    id: 'visit-guide',
    name: 'Visit & Experience',
    topics: [
      'First Timer\'s Guide to WoodBine Food Hall in Salt Lake',
      'How to Plan a Group Dinner at WoodBine',
      'Weekend Walk-In Guide: What to Expect at the Hall',
    ],
  },
  {
    id: 'local-food',
    name: 'Salt Lake Food Scene',
    topics: [
      'Why Salt Lake\'s Arts District Is a Food Destination',
      'Best Late-Night Bites Near WoodBine',
      'Supporting Local: How WoodBine Vendors Source in Utah',
    ],
  },
  {
    id: 'events',
    name: 'Events & Community',
    topics: [
      'Hosting a Private Event at WoodBine Food Hall',
      'Live Music Nights at the Hall: What\'s Coming Up',
      'Community Night at WoodBine: Neighbors, Vendors, and New Flavors',
    ],
  },
  {
    id: 'seasonal',
    name: 'Seasonal Menu',
    topics: [
      'Fall Flavors at WoodBine: Seasonal Dishes to Order Now',
      'Summer at the Hall: Cold Drinks and Shared Plates',
      'Holiday Catering from WoodBine Vendors',
    ],
  },
  {
    id: 'behind-the-hall',
    name: 'Behind the Hall',
    topics: [
      'Old Hall, New Flavors: Restoring a Warehouse into a Food Hall',
      'How WoodBine Chooses Its Vendor Counters',
      'A Day in the Life of a WoodBine Hall Manager',
    ],
  },
];

export async function GET(req: Request) {
  try {
    requireConfiguredBearerToken(req, 'CRON_SECRET');
    const secret = process.env.CRON_SECRET!;

    const niche = NICHES[Math.floor(Math.random() * NICHES.length)];
    const topic = niche.topics[Math.floor(Math.random() * niche.topics.length)];

    logger.info('Triggering blog automation cron', { niche: niche.name, topic });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/admin/blog/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
        Origin: new URL(baseUrl).origin,
      },
      body: JSON.stringify({
        topic,
        categoryId: niche.id,
      }),
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      execution: {
        niche: niche.name,
        topic,
        article: result.article || null,
        error: result.error || null,
      },
    });
  } catch (error: any) {
    logger.error('Cron blog automation failed', { error: error.message, stack: error.stack });
    return jsonError(error, 'Cron blog automation failed');
  }
}
