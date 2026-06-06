/**
 * [LAYER: INFRASTRUCTURE]
 * Industrialized Seeding Infrastructure for WoodBine.
 * Features: Admin SDK Integration, Forensic Lifecycle Seeding, and Relational Sovereignty.
 * Firestore Admin Version.
 */
import type { 
  ProductDraft, 
  OrderStatus, 
  SupportTicket, 
  KnowledgebaseCategory, 
  KnowledgebaseArticle,
  Supplier,
  InventoryLocation,
  Discount,
  OrderItem
} from '@domain/models';
import { logger } from '@utils/logger';
import { adminAuth, adminDb } from '../firebase/admin';
import { Timestamp, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { BLOG_AUTHORS, BLOG_SERIES, BLOG_POSTS } from './BlogSeedData';
import { EXTENDED_SERIES, EXTENDED_POSTS } from './ExtendedBlogSeedData';

// ─────────────────────────────────────────────
// COMPREHENSIVE MOCK DATA
// ─────────────────────────────────────────────

const INITIAL_CATALOG: ProductDraft[] = [
  {
    name: 'Cold Brew Latte',
    description: 'Single-origin cold brew with oat milk and a touch of vanilla — from our hall coffee counter.',
    price: 550,
    category: 'drink',
    productType: 'Beverage',
    stock: 100,
    status: 'active',
    imageUrl: '/assets/generated/scarlet_violet_booster_box_1778177072594.png',
    sku: 'WB-DRK-001',
    handle: 'cold-brew-latte',
    collections: ['bestsellers', 'coffee'],
    trackQuantity: true,
    physicalItem: true,
    media: [],
    seoTitle: 'Cold Brew Latte — Coffee Counter at WoodBine',
    seoDescription: 'Single-origin cold brew with oat milk at WoodBine food hall in Salt Lake. Walk in and order at the counter.',
  },
  {
    name: 'Smoked Brisket Bowl',
    description: 'Slow-smoked brisket over rice with pickled onions, hall sauce, and seasonal greens.',
    price: 1499,
    category: 'entree',
    productType: 'Food',
    stock: 40,
    status: 'active',
    imageUrl: '/assets/generated/charizard_ex_holo_1778177088908.png',
    sku: 'WB-ENT-001',
    handle: 'smoked-brisket-bowl',
    collections: ['bestsellers', 'hearty'],
    trackQuantity: true,
    physicalItem: true,
    media: [],
  },
  {
    name: 'Seasonal Shared Plate',
    description: 'Chef\'s rotating shared plate — ideal for splitting at the communal tables.',
    price: 1800,
    category: 'appetizer',
    productType: 'Food',
    stock: 25,
    status: 'active',
    imageUrl: '/assets/generated/custom_playmat_1778177102037.png',
    handle: 'seasonal-shared-plate',
    collections: ['seasonal'],
    trackQuantity: true,
    physicalItem: true,
    media: [],
  },
  {
    name: 'WoodBine Gift Card',
    description: 'Digital gift card redeemable at any vendor counter in the hall.',
    price: 2500,
    category: 'other',
    productType: 'Gift Card',
    stock: 999,
    status: 'active',
    imageUrl: '/assets/generated/tcg_digital_guide_1778177116259.png',
    handle: 'woodbine-gift-card',
    collections: ['gifts'],
    isDigital: true,
    sku: 'WB-GC-025',
    trackQuantity: false,
    physicalItem: false,
    media: [],
  },
];

const INITIAL_CUSTOMERS = [
  { email: 'admin@woodbine.com', passwordEnv: 'SEED_ADMIN_PASSWORD', displayName: 'System Admin', role: 'admin' as const },
  { email: 'manager@woodbine.com', passwordEnv: 'SEED_ALCHEMIST_PASSWORD', displayName: 'Hall Manager', role: 'admin' as const },
  { email: 'alex.morgan@example.com', displayName: 'Alex Morgan', role: 'customer' as const },
  { email: 'jordan.lee@example.com', displayName: 'Jordan Lee', role: 'customer' as const },
];

const KB_DATA = {
  categories: [
    { id: 'vendor-spotlights', name: 'Vendor Spotlights', slug: 'vendor-spotlights', description: 'Meet the counters and makers at the hall.', icon: 'utensils', articleCount: 2 },
    { id: 'visit-guide', name: 'Visit Guide', slug: 'visit-guide', description: 'Hours, directions, and first-timer tips.', icon: 'map-pin', articleCount: 2 },
    { id: 'local-food', name: 'Salt Lake Food', slug: 'local-food', description: 'Neighborhood dining and arts district guides.', icon: 'sparkles', articleCount: 1 },
    { id: 'events', name: 'Events', slug: 'events', description: 'Live nights, private bookings, and community gatherings.', icon: 'calendar', articleCount: 1 },
    { id: 'seasonal', name: 'Seasonal Menu', slug: 'seasonal', description: 'Rotating dishes and limited-time counters.', icon: 'sun', articleCount: 1 },
    { id: 'order-issues', name: 'Order Help', slug: 'order-issues', description: 'Track orders and get support.', icon: 'package', articleCount: 1 },
    { id: 'returns-refunds', name: 'Returns & Refunds', slug: 'returns-refunds', description: 'Our policies for orders and gift cards.', icon: 'rotate-ccw', articleCount: 1 },
  ],
  articles: [
    {
      id: 'art-1',
      categoryId: 'order-issues',
      title: 'How to track your order',
      slug: 'how-to-track-order',
      excerpt: 'Find out where your package is and when it will arrive.',
      content: '# How to track your order\n\nOnce your order has shipped, you will receive an email with a tracking number.',
      viewCount: 1540,
      helpfulCount: 120,
      notHelpfulCount: 5,
      tags: ['tracking', 'shipping'],
      type: 'article' as const,
      status: 'published' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
};

const BLOG_DATA = {
  authors: BLOG_AUTHORS,
  series: BLOG_SERIES,
  posts: BLOG_POSTS,
  comments: [
    {
      id: 'comm-1',
      postId: 'blog-1',
      userId: 'user-1',
      userName: 'Alex Morgan',
      content: 'This guide made our first visit so easy — loved trying three counters in one night!',
      status: 'published' as const,
      likes: 12,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
};


const SUPPLIERS: Partial<Supplier>[] = [
  {
    id: 'sup-1',
    name: 'Wasatch Provisions Co.',
    contactName: 'Riley Park',
    email: 'orders@wasatchprovisions.example',
    phone: '801-555-0100',
    website: 'https://wasatchprovisions.example',
    address: { street: '400 W 200 S', city: 'Salt Lake City', state: 'UT', zip: '84101', country: 'US' },
  },
];

const LOCATIONS: Partial<InventoryLocation>[] = [
  { id: 'loc-warehouse', name: 'WoodBine Main Hall', type: 'warehouse', address: 'Arts District, Salt Lake City, UT', isDefault: true, isActive: true },
];

const MACROS = [
  { id: 'mac-1', name: 'Shipping Status Update', content: 'Hello! Your order is currently being processed and will ship within 24 hours. You will receive a tracking number shortly.', category: 'Shipping', slug: 'shipping-update' },
];

const DISCOUNTS: Partial<Discount>[] = [
  { id: 'disc-1', code: 'WELCOME10', type: 'percentage', value: 10, status: 'active', isAutomatic: false, startsAt: new Date(), usageCount: 50 },
];

const MOCK_ACTOR = { id: 'system', email: 'admin@woodbine.com' };

// ─────────────────────────────────────────────
// SEEDING LOGIC
// ─────────────────────────────────────────────

function assertSeedingAllowed(): void {
  const allowInProduction = process.env.ALLOW_PRODUCTION_SEEDING === 'true';
  if (process.env.NODE_ENV === 'production' && !allowInProduction) {
    throw new Error('PRODUCTION_BLOCK: Seeding is prohibited in production unless ALLOW_PRODUCTION_SEEDING=true.');
  }
}

export async function seedTaxonomy(): Promise<void> {
  // Collections
  const collections = [
    { id: 'coll-best', name: 'Hall Favorites', handle: 'bestsellers', status: 'active' as const, productCount: 12, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
    { id: 'coll-seasonal', name: 'Seasonal', handle: 'seasonal', status: 'active' as const, productCount: 8, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
    { id: 'coll-coffee', name: 'Coffee & Drinks', handle: 'coffee', status: 'active' as const, productCount: 6, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
    { id: 'coll-hearty', name: 'Hearty Plates', handle: 'hearty', status: 'active' as const, productCount: 10, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
    { id: 'coll-gifts', name: 'Gift Cards & Merch', handle: 'gifts', status: 'active' as const, productCount: 4, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  ];

  for (const coll of collections) {
    await adminDb.collection('collections').doc(coll.id).set(coll);
  }

  // Product Categories
  const cats = [
    { id: 'cat-food', name: 'Food', slug: 'food', description: 'Entrees, plates, and hall menu items', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
    { id: 'cat-drinks', name: 'Drinks', slug: 'drinks', description: 'Coffee, tea, and beverages', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  ];

  for (const cat of cats) {
    await adminDb.collection('product_categories').doc(cat.id).set(cat);
  }

  const types = ['Food', 'Beverage', 'Gift Card', 'Merchandise'];
  for (const t of types) {
    const id = crypto.randomUUID();
    await adminDb.collection('product_types').doc(id).set({ id, name: t, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  }
}

export async function seedSuppliers(): Promise<number> {
  assertSeedingAllowed();
  let created = 0;
  
  for (const sup of SUPPLIERS) {
    await adminDb.collection('suppliers').doc(sup.id!).set({
      ...sup,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    created++;
  }
  return created;
}

export async function seedLocations(): Promise<number> {
  assertSeedingAllowed();
  let created = 0;
  
  for (const loc of LOCATIONS) {
    await adminDb.collection('inventory_locations').doc(loc.id!).set({
      ...loc,
      createdAt: Timestamp.now()
    });
    created++;
  }
  return created;
}

export async function seedInventory(): Promise<number> {
  assertSeedingAllowed();
  const productsSnap = await adminDb.collection('products').get();
  const locationsSnap = await adminDb.collection('inventory_locations').get();
  let created = 0;

  if (locationsSnap.empty) {
    logger.warn('SKIPPED: Inventory seeding skipped because no locations found.');
    return 0;
  }

  const locations = locationsSnap.docs.map((d: QueryDocumentSnapshot) => d.id);

  for (const prodDoc of productsSnap.docs) {
    const prod = prodDoc.data();
    for (const locId of locations) {
      const id = `${prodDoc.id}_${locId}`;
      await adminDb.collection('inventory_levels').doc(id).set({
        productId: prodDoc.id,
        locationId: locId,
        availableQty: Math.floor((prod.stock || 0) / locations.length),
        reservedQty: 0,
        incomingQty: 0,
        reorderPoint: 5,
        reorderQty: 20,
        updatedAt: Timestamp.now()
      });
      created++;
    }
  }
  return created;
}

export async function seedProducts(): Promise<number> {
  assertSeedingAllowed();
  let created = 0;

  for (const product of INITIAL_CATALOG) {
    const id = crypto.randomUUID();
    const now = Timestamp.now();
    await adminDb.collection('products').doc(id).set({
      ...product,
      id,
      createdAt: now,
      updatedAt: now,
      media: product.media?.map(m => ({ ...m, createdAt: now })) || []
    });
    created++;
  }

  // Parse and seed the cleaned CSV sheets
  const csvFiles = [
    'dreamshop_export-2026-05-26T01-10-59-261Z.csv',
    'dreamshop_export-2026-05-26T01-24-39-869Z.csv',
    'dreamshop_export-2026-05-26T02-03-37-515Z.csv'
  ];

  for (const filename of csvFiles) {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) {
      logger.warn(`CSV file not found during seeding: ${filePath}`);
      continue;
    }

    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) continue;

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      const handleIdx = headers.indexOf('Handle');
      const titleIdx = headers.indexOf('Title');
      const bodyIdx = headers.indexOf('Body (HTML)');
      const vendorIdx = headers.indexOf('Vendor');
      const typeIdx = headers.indexOf('Custom Product Type');
      const tagsIdx = headers.indexOf('Tags');
      const publishedIdx = headers.indexOf('Published');
      const skuIdxCol = headers.indexOf('Variant SKU');
      const priceIdxCol = headers.indexOf('Variant Price');
      const compareAtPriceIdxCol = headers.indexOf('Variant Compare At Price');
      const imageIdxCol = headers.indexOf('Image Src');
      const qtyIdxCol = headers.indexOf('Variant Inventory Qty');
      const gramsIdxCol = headers.indexOf('Variant Grams');
      const requiresShippingIdxCol = headers.indexOf('Variant Requires Shipping');
      const taxableIdxCol = headers.indexOf('Variant Taxable');
      const barcodeIdxCol = headers.indexOf('Variant Barcode');
      const costIdxCol = headers.indexOf('Cost');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Custom CSV line parser
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            if (inQuotes && line[j + 1] === '"') {
              current += '"';
              j++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        // Trim values and remove surrounding quotes if any
        const cleanedValues = values.map(val => {
          if (val.startsWith('"') && val.endsWith('"')) {
            return val.substring(1, val.length - 1);
          }
          return val;
        });

        const title = cleanedValues[titleIdx];
        if (!title) continue;

        const handle = cleanedValues[handleIdx] || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const priceDollar = parseFloat(cleanedValues[priceIdxCol] || '0');
        const price = Math.round(priceDollar * 100);

        const compareAtPriceDollar = parseFloat(cleanedValues[compareAtPriceIdxCol] || '0');
        const compareAtPrice = isNaN(compareAtPriceDollar) || compareAtPriceDollar <= 0 ? undefined : Math.round(compareAtPriceDollar * 100);

        const costDollar = parseFloat(cleanedValues[costIdxCol] || '0');
        const cost = isNaN(costDollar) || costDollar <= 0 ? undefined : Math.round(costDollar * 100);

        const stock = parseInt(cleanedValues[qtyIdxCol] || '100', 10);
        const weightGrams = parseInt(cleanedValues[gramsIdxCol] || '0', 10);
        const imageUrl = cleanedValues[imageIdxCol] || '';

        const tags = cleanedValues[tagsIdx] ? cleanedValues[tagsIdx].split(',').map(t => t.trim()).filter(Boolean) : [];
        const isDigital = cleanedValues[requiresShippingIdxCol]?.toLowerCase() === 'false';
        const isTaxable = cleanedValues[taxableIdxCol]?.toLowerCase() !== 'false';

        const now = Timestamp.now();
        const id = crypto.randomUUID();

        const productDraft: any = {
          name: title,
          description: cleanedValues[bodyIdx] || `No description for ${title}`,
          price,
          category: 'other', // Board games categorized as 'other'
          productType: cleanedValues[typeIdx] || 'Board Games',
          vendor: cleanedValues[vendorIdx] || 'Other',
          tags,
          collections: ['new'],
          handle,
          seoTitle: title,
          seoDescription: `Get the fun and exciting ${title}. Perfect for family game nights, parties, and gifts!`,
          salesChannels: ['online_store'],
          stock,
          trackQuantity: true,
          continueSellingWhenOutOfStock: false,
          physicalItem: !isDigital,
          weightGrams,
          imageUrl,
          status: cleanedValues[publishedIdx]?.toLowerCase() === 'true' ? 'active' : 'draft',
          taxable: isTaxable,
          media: imageUrl ? [{ id: 'med-1', url: imageUrl, altText: title, position: 1, createdAt: now } as any] : []
        };

        if (compareAtPrice !== undefined) productDraft.compareAtPrice = compareAtPrice;
        if (cost !== undefined) productDraft.cost = cost;
        if (cleanedValues[skuIdxCol]) productDraft.sku = cleanedValues[skuIdxCol];
        if (cleanedValues[barcodeIdxCol]) productDraft.barcode = cleanedValues[barcodeIdxCol];

        await adminDb.collection('products').doc(id).set({
          ...productDraft,
          id,
          createdAt: now,
          updatedAt: now,
        });

        created++;
      }
    } catch (err) {
      logger.error(`Failed parsing or seeding CSV file: ${filename}`, err);
    }
  }

  return created;
}

export async function clearAuditLogs(): Promise<void> {
  assertSeedingAllowed();
  const snapshot = await adminDb.collection('hive_audit').get();
  const batch = adminDb.batch();
  snapshot.docs.forEach((doc: QueryDocumentSnapshot) => batch.delete(doc.ref));
  await batch.commit();
  logger.info('[Forensic] Audit logs cleared for clean chain initialization.');
}

export async function seedCustomers(): Promise<number> {
  assertSeedingAllowed();
  let created = 0;

  for (const customer of INITIAL_CUSTOMERS) {
    try {
      let uid;
      try {
        const userRecord = await adminAuth.getUserByEmail(customer.email);
        uid = userRecord.uid;
      } catch (authErr: any) {
        if (authErr.code === 'getAuth()/user-not-found') {
          const password = customer.passwordEnv
            ? process.env[customer.passwordEnv]
            : crypto.randomUUID() + crypto.randomUUID();
          if (!password) {
            throw new Error(`${customer.passwordEnv} must be set to seed admin accounts.`);
          }
          const userRecord = await adminAuth.createUser({
            email: customer.email,
            password,
            displayName: customer.displayName,
          });
          uid = userRecord.uid;
        } else {
          throw authErr;
        }
      }
      
      if (uid) {
        await adminDb.collection('users').doc(uid).set({
          email: customer.email,
          displayName: customer.displayName,
          role: customer.role || 'customer',
          createdAt: Timestamp.now(),
        });
        created++;
      }
    } catch (err) {
      logger.error(`Forensic Fault: Failed to seed customer ${customer.email}.`, err);
    }
  }
  return created;
}

export async function seedOrders(): Promise<number> {
  assertSeedingAllowed();
  const productsSnap = await adminDb.collection('products').get();
  const customersSnap = await adminDb.collection('users').where('role', '==', 'customer').get();
  
  if (productsSnap.empty || customersSnap.empty) return 0;

  const statuses: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];
  let created = 0;
  for (let i = 0; i < 5; i++) {
    try {
      const customerDoc = customersSnap.docs[Math.floor(Math.random() * customersSnap.size)];
      const prodDoc = productsSnap.docs[Math.floor(Math.random() * productsSnap.size)];
      const prod = prodDoc.data();
      
      const id = crypto.randomUUID();
      const now = Timestamp.now();
      await adminDb.collection('orders').doc(id).set({
        id,
        userId: customerDoc.id,
        items: [{ productId: prodDoc.id, name: prod.name, quantity: 1, unitPrice: prod.price }],
        total: prod.price,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        shippingAddress: { street: '123 Fake St', city: 'Springfield', state: 'IL', zip: '62704', country: 'US' },
        paymentTransactionId: `seeded_${crypto.randomUUID()}`,
        idempotencyKey: crypto.randomUUID(),
        notes: [],
        riskScore: 0,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    } catch (err) {
      logger.error(`Forensic Fault: Failed to seed order iteration ${i}.`, err);
    }
  }
  return created;
}

export async function seedKnowledgebase(): Promise<number> {
  assertSeedingAllowed();
  let created = 0;
  for (const cat of KB_DATA.categories) {
    await adminDb.collection('knowledgebase_categories').doc(cat.id).set(cat);
    created++;
  }
  for (const art of KB_DATA.articles) {
    await adminDb.collection('knowledgebase_articles').doc(art.id).set({
      ...art,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    created++;
  }
  return created;
}

export async function seedBlog(): Promise<number> {
  assertSeedingAllowed();
  let created = 0;
  
  const allSeries = [...BLOG_DATA.series, ...EXTENDED_SERIES];
  const allPosts = [...BLOG_DATA.posts, ...EXTENDED_POSTS];

  for (const s of allSeries) {
    await adminDb.collection('blog_series').doc(s.id).set({
      ...s,
      createdAt: Timestamp.fromDate(s.createdAt),
      updatedAt: Timestamp.fromDate(s.updatedAt)
    });
    created++;
  }

  for (const auth of BLOG_DATA.authors) {
    await adminDb.collection('blog_authors').doc(auth.id).set({
      ...auth,
      createdAt: Timestamp.fromDate(auth.createdAt),
      updatedAt: Timestamp.fromDate(auth.updatedAt)
    });
    created++;
  }
  
  for (const post of allPosts) {
    // Get actual product IDs for relations if possible
    const productsSnap = await adminDb.collection('products').limit(2).get();
    const prodIds = productsSnap.docs.map((d: any) => d.id);

    
    await adminDb.collection('knowledgebase_articles').doc(post.id).set({
      ...post,
      relatedProductIds: prodIds,
      createdAt: Timestamp.fromDate(post.createdAt),
      updatedAt: Timestamp.fromDate(post.updatedAt),
      publishedAt: post.publishedAt ? Timestamp.fromDate(post.publishedAt) : null
    });
    created++;
  }
  
  for (const comm of BLOG_DATA.comments) {
    await adminDb.collection('blog_comments').doc(comm.id).set({
      ...comm,
      createdAt: Timestamp.fromDate(comm.createdAt),
      updatedAt: Timestamp.fromDate(comm.updatedAt)
    });
    created++;
  }
  
  return created;
}


export async function seedTickets(): Promise<number> {
  assertSeedingAllowed();
  const customersSnap = await adminDb.collection('users').limit(1).get();
  if (customersSnap.empty) return 0;
  
  let created = 0;
  const customer = customersSnap.docs[0].data();
  const userId = customersSnap.docs[0].id;
  const id = crypto.randomUUID();
  const now = Timestamp.now();
  
  await adminDb.collection('support_tickets').doc(id).set({
    id,
    userId: userId,
    customerEmail: customer.email,
    customerName: customer.displayName,
    subject: 'Initial Support Request',
    priority: 'medium',
    status: 'open',
    createdAt: now,
    updatedAt: now,
  });

  const messageId = crypto.randomUUID();
  await adminDb.collection('ticket_messages').doc(messageId).set({
    id: messageId,
    ticketId: id,
    senderId: userId,
    senderType: 'customer',
    content: 'Hello, I need help with my order.',
    createdAt: now,
    visibility: 'public'
  });

  created++;
  return created;
}

export async function seedMacros(): Promise<number> {
  assertSeedingAllowed();
  for (const mac of MACROS) {
    await adminDb.collection('support_macros').doc(mac.id).set(mac);
  }
  return MACROS.length;
}

export async function seedDiscounts(): Promise<number> {
  assertSeedingAllowed();
  for (const disc of DISCOUNTS) {
    await adminDb.collection('discounts').doc(disc.id!).set({
      ...disc,
      createdAt: Timestamp.now()
    });
  }
  return DISCOUNTS.length;
}

export async function seedSettings(): Promise<number> {
  assertSeedingAllowed();
  const settings = [
    { id: 'store_name', value: 'WoodBine' },
    { id: 'currency', value: 'USD' },
  ];
  for (const s of settings) {
    await adminDb.collection('settings').doc(s.id).set({ value: s.value });
  }
  return settings.length;
}

export async function seedProcurement(): Promise<number> {
  assertSeedingAllowed();
  const productsSnap = await adminDb.collection('products').limit(1).get();
  const suppliersSnap = await adminDb.collection('suppliers').limit(1).get();
  if (productsSnap.empty || suppliersSnap.empty) return 0;

  const prodId = productsSnap.docs[0].id;
  const supId = suppliersSnap.docs[0].id;
  const id = crypto.randomUUID();
  const now = Timestamp.now();

  await adminDb.collection('purchase_orders').doc(id).set({
    id,
    supplier: supId,
    referenceNumber: 'PO-SEED-001',
    status: 'ordered',
    items: [{ id: crypto.randomUUID(), productId: prodId, orderedQty: 10, unitCost: 500, receivedQty: 0, totalCost: 5000 }],
    totalCost: 5000,
    createdAt: now,
    updatedAt: now
  });
  return 1;
}

export async function seedAll(): Promise<void> {
  assertSeedingAllowed();
  logger.info('Starting Firestore database seeding via Admin SDK...');
  
  await clearAuditLogs();
  await seedTaxonomy();
  await seedSettings();
  await seedMacros();
  await seedDiscounts();
  await seedProducts();
  await seedCustomers();
  await seedLocations();
  await seedInventory();
  await seedKnowledgebase();
  await seedBlog();
  await seedOrders();
  await seedTickets();
  await seedProcurement();
  
  logger.info('Firestore seeding complete!');
}
