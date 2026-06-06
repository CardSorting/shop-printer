import { describe, expect, it } from 'vitest';
import { auditCatalogListing, summarizeCatalogAudits } from './catalog';

describe('domain/seo/catalog', () => {
  it('flags weak listings in batch summary', () => {
    const items = [
      auditCatalogListing({
        id: '1',
        name: 'Strong Item',
        seoTitle: 'Cold Brew Latte — Coffee Counter at WoodBine Food Hall',
        seoDescription:
          'Order a cold brew latte at WoodBine in Salt Lake City. A neighborhood favorite for patio mornings and laptop afternoons under the barrel roof at our food hall.',
        handle: 'cold-brew',
        imageUrl: '/a.jpg',
        editPath: '/admin/products/1/edit',
        publicPath: '/products/cold-brew',
        kind: 'product',
      }),
      auditCatalogListing({
        id: '2',
        name: 'Weak',
        editPath: '/admin/products/2/edit',
        publicPath: '/products/weak',
        kind: 'product',
      }),
    ];
    const summary = summarizeCatalogAudits(items);
    expect(summary.total).toBe(2);
    expect(summary.needsWork).toBe(1);
    expect(summary.averageScore).toBeGreaterThan(0);
    expect(summary.items[0]?.name).toBe('Weak');
  });

  it('audits help center articles as help kind', () => {
    const item = auditCatalogListing({
      id: 'h1',
      name: 'How to track your order',
      description: 'Find out where your package is and when it will arrive at WoodBine.',
      seoTitle: 'Track Your Order at WoodBine Food Hall in Salt Lake City',
      seoDescription:
        'Find order status and delivery updates for WoodBine food hall purchases in Salt Lake. Walk-in and online order help for guests visiting our warehouse dining hall.',
      handle: 'how-to-track-order',
      editPath: '/admin/blog/h1',
      publicPath: '/support/articles/how-to-track-order',
      kind: 'help',
    });
    expect(item.kind).toBe('help');
    expect(item.score).toBeGreaterThan(50);
  });
});
