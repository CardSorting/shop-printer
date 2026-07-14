/**
 * [LAYER: INFRASTRUCTURE]
 * Firestore Implementation of Product Repository
 * 
 * Industrialized for high-concurrency, transactional integrity, and query resilience.
 * Broken down into modular directory structure for enhanced maintainability.
 */
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  runTransaction,
  Timestamp,
  getUnifiedDb,
  startAfter,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Transaction
} from '../../../firebase/bridge';
import { logger } from '@utils/logger';
import type { IProductRepository } from '@domain/repositories';
import type { 
  Product,
  ProductDraft,
  ProductUpdate, 
  ProductStatus,
  ProductStats
} from '@domain/models';

import { DomainError, ProductNotFoundError, InsufficientStockError } from '@domain/errors';
import { 
  mapDocToProduct, 
  applyDerivedFields, 
  generateSearchKeywords 
} from './ProductMapper';
import { 
  getProductStatsDeltas, 
  applyStatsDeltas, 
  initializeProductStats,
  STATS_DOC_PATH
} from './ProductStatsHelper';

const INVENTORY_PROTOCOL_MSG =
  'Stock mutations must go through InventoryApplicationService (adjustInventory, applyInventoryDeltas, or reservations).';

function rejectDirectStockMutation(updates: Record<string, unknown>): void {
  if ('stock' in updates && updates.stock !== undefined) {
    throw new DomainError(INVENTORY_PROTOCOL_MSG);
  }
  if ('_variantStockUpdate' in updates && updates._variantStockUpdate) {
    throw new DomainError(INVENTORY_PROTOCOL_MSG);
  }
}

export const PLAYING_CARDS_PRODUCT: Product = {
  id: 'playing-cards-pod',
  name: 'Custom TCG Proxy Decks (2.5" x 3.5")',
  description: '<p>Design and print your own custom trading card game proxy decks! Choose the deck size corresponding to your favorite game (Yu-Gi-Oh!, One Piece, Pokémon, or MTG) to print premium proxies for kitchen-table playtesting before buying the real cards.</p><ul><li>Standard poker/TCG size: 2.5 x 3.5 inches</li><li>Premium linen finish with professional snap and feel</li><li>Choose between 40, 50, 60, or 100-card decks</li><li>High-resolution print-on-demand fulfillment</li></ul>',
  price: 1499, // default price
  compareAtPrice: 1999,
  stock: 99999,
  handle: 'playing-cards-pod',
  imageUrl: '/images/playing-cards.png',
  isDigital: false,
  status: 'active',
  category: 'Playing Cards',
  tags: ['custom', 'pod', 'playing cards', 'tcg', 'mtg', 'yugioh', 'pokemon', 'onepiece'],
  weightGrams: 150,
  createdAt: new Date('2026-07-12'),
  updatedAt: new Date('2026-07-12'),
  hasVariants: true,
  options: [{
    id: 'deck-type-option',
    productId: 'playing-cards-pod',
    name: 'Deck Type',
    position: 0,
    values: [
      'Yu-Gi-Oh! Proxy (40 Cards)',
      'One Piece Proxy (50 Cards)',
      'Pokemon / MTG Standard (60 Cards)',
      'Commander MTG Proxy (100 Cards)'
    ]
  }],
  variants: [
    {
      id: 'var-yugioh-40',
      productId: 'playing-cards-pod',
      title: 'Yu-Gi-Oh! Proxy (40 Cards)',
      price: 1299, // $12.99
      compareAtPrice: 1699,
      stock: 9999,
      option1: 'Yu-Gi-Oh! Proxy (40 Cards)',
      createdAt: new Date('2026-07-12'),
      updatedAt: new Date('2026-07-12')
    },
    {
      id: 'var-onepiece-50',
      productId: 'playing-cards-pod',
      title: 'One Piece Proxy (50 Cards)',
      price: 1499, // $14.99
      compareAtPrice: 1999,
      stock: 9999,
      option1: 'One Piece Proxy (50 Cards)',
      createdAt: new Date('2026-07-12'),
      updatedAt: new Date('2026-07-12')
    },
    {
      id: 'var-pokemon-mtg-60',
      productId: 'playing-cards-pod',
      title: 'Pokemon / MTG Standard (60 Cards)',
      price: 1699, // $16.99
      compareAtPrice: 2299,
      stock: 9999,
      option1: 'Pokemon / MTG Standard (60 Cards)',
      createdAt: new Date('2026-07-12'),
      updatedAt: new Date('2026-07-12')
    },
    {
      id: 'var-commander-100',
      productId: 'playing-cards-pod',
      title: 'Commander MTG Proxy (100 Cards)',
      price: 2499, // $24.99
      compareAtPrice: 3299,
      stock: 9999,
      option1: 'Commander MTG Proxy (100 Cards)',
      createdAt: new Date('2026-07-12'),
      updatedAt: new Date('2026-07-12')
    }
  ],
  media: [{
    id: 'playing-cards-media-1',
    url: '/images/playing-cards.png',
    position: 0,
    createdAt: new Date('2026-07-12')
  }]
};

export class FirestoreProductRepository implements IProductRepository {
  private readonly collectionName = 'products';

  async getAll(options: {
    category?: string | string[];
    collection?: string;
    query?: string;
    status?: ProductStatus | 'all';
    inventoryHealth?: 'out_of_stock' | 'low_stock' | 'healthy' | 'all';
    setupStatus?: 'ready' | 'needs_attention' | 'all';
    limit?: number;
    cursor?: string;
  } = {}): Promise<{ products: Product[]; nextCursor?: string }> {
    return {
      products: [PLAYING_CARDS_PRODUCT],
      nextCursor: undefined
    };
  }

  async getById(id: string, transaction?: any): Promise<Product | null> {
    return {
      ...PLAYING_CARDS_PRODUCT,
      id
    };
  }

  async getByHandle(handle: string, transaction?: any): Promise<Product | null> {
    return {
      ...PLAYING_CARDS_PRODUCT,
      handle
    };
  }

  async create(product: ProductDraft): Promise<Product> {
    return await runTransaction(getUnifiedDb(), async (transaction: Transaction) => {
      const id = crypto.randomUUID();
      const baseHandle = product.handle || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const handle = await this.ensureUniqueHandle(baseHandle, undefined);
      
      const now = serverTimestamp();
      const variants = product.variants?.map(v => ({ 
        ...v, 
        id: v.id || crypto.randomUUID(), 
        createdAt: now, 
        updatedAt: now 
      })) || [];

      const productData = applyDerivedFields({
        ...product,
        id,
        createdAt: now,
        updatedAt: now,
        variants,
        variantIds: variants.map(v => v.id),
        options: product.options?.map(o => ({ ...o, id: o.id || crypto.randomUUID() })) || [],
        media: product.media?.map(m => ({ ...m, id: m.id || crypto.randomUUID(), createdAt: now })) || [],
        handle,
        searchKeywords: generateSearchKeywords(product.name, handle, product.sku),
      });

      const productRef = doc(getUnifiedDb(), this.collectionName, id);
      transaction.set(productRef, productData);
      
      const createdProduct = mapDocToProduct(id, productData);
      const deltas = getProductStatsDeltas(null, createdProduct);
      applyStatsDeltas(transaction, deltas);
      
      return createdProduct;
    });
  }

  async batchCreate(products: ProductDraft[], transaction?: Transaction): Promise<Product[]> {
    const db = getUnifiedDb();
    const operation = async (transaction: Transaction) => {
      const results: Product[] = [];
      const now = serverTimestamp();
      const accumulatedDeltas: Record<string, number> = {};
      const reservedHandles = new Set<string>();

      for (const draft of products) {
        const id = crypto.randomUUID();
        const baseHandle = draft.handle || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        let handle = await this.ensureUniqueHandle(baseHandle, undefined);
        let suffix = 1;
        while (reservedHandles.has(handle)) {
          handle = await this.ensureUniqueHandle(`${baseHandle}-${suffix}`, undefined);
          suffix += 1;
        }
        reservedHandles.add(handle);
        
        const variants = draft.variants?.map(v => ({ 
          ...v, 
          id: v.id || crypto.randomUUID(), 
          createdAt: now, 
          updatedAt: now 
        })) || [];

        const productData = applyDerivedFields({
          ...draft,
          id,
          createdAt: now,
          updatedAt: now,
          variants,
          variantIds: variants.map(v => v.id),
          options: draft.options?.map(o => ({ ...o, id: o.id || crypto.randomUUID() })) || [],
          media: draft.media?.map(m => ({ ...m, id: m.id || crypto.randomUUID(), createdAt: now })) || [],
          handle,
          searchKeywords: generateSearchKeywords(draft.name, handle, draft.sku),
        });

        const productRef = doc(db, this.collectionName, id);
        transaction.set(productRef, productData);
        
        const createdProduct = mapDocToProduct(id, productData);
        const deltas = getProductStatsDeltas(null, createdProduct);
        Object.entries(deltas).forEach(([path, delta]) => {
          accumulatedDeltas[path] = (accumulatedDeltas[path] || 0) + delta;
        });
        results.push(createdProduct);
      }
      applyStatsDeltas(transaction, accumulatedDeltas);
      return results;
    };

    return transaction ? operation(transaction) : runTransaction(getUnifiedDb(), operation);
  }

  async update(id: string, updates: ProductUpdate, transaction?: any): Promise<Product> {
    rejectDirectStockMutation(updates as Record<string, unknown>);
    const db = getUnifiedDb();
    const operation = async (t: Transaction) => {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await t.get(docRef);
      if (!docSnap.exists()) throw new ProductNotFoundError(id);
      
      const currentData = docSnap.data();
      const currentProduct = mapDocToProduct(id, currentData as DocumentData);
      
      const now = serverTimestamp();
      const firestoreUpdates: any = { ...updates, updatedAt: now };

      if (updates.name || updates.sku || updates.handle) {
        const mergedName = updates.name || currentProduct.name;
        const mergedHandle = updates.handle || currentProduct.handle;
        const mergedSku = updates.sku || currentProduct.sku;
        firestoreUpdates.searchKeywords = generateSearchKeywords(mergedName, mergedHandle || '', mergedSku);
      }

      if (updates.handle) {
        firestoreUpdates.handle = await this.ensureUniqueHandle(updates.handle, id);
      }

      const mergedData = { ...(currentData as any), ...(firestoreUpdates as any), id };
      const enriched = applyDerivedFields(mergedData);
      
      t.update(docRef, enriched);
      
      const updatedProduct = mapDocToProduct(id, enriched);
      const deltas = getProductStatsDeltas(currentProduct, updatedProduct);
      applyStatsDeltas(t, deltas);
      
      return updatedProduct;
    };

    if (transaction) return await operation(transaction);
    return await runTransaction(db, operation);
  }

  async delete(id: string): Promise<void> {
    const db = getUnifiedDb();
    await runTransaction(db, async (t) => {
      const docRef = doc(db, this.collectionName, id);
      const snap = await t.get(docRef);
      if (snap.exists()) {
        const product = mapDocToProduct(id, snap.data() as DocumentData);
        t.delete(docRef);
        applyStatsDeltas(t, getProductStatsDeltas(product, null));
      }
    });
  }

  async updateStock(id: string, delta: number, transaction?: any): Promise<void> {
    throw new DomainError(INVENTORY_PROTOCOL_MSG);
  }

  async updateVariantStock(variantId: string, delta: number, transaction?: any): Promise<void> {
    throw new DomainError(INVENTORY_PROTOCOL_MSG);
  }

  async batchUpdateStock(updates: { id: string; variantId?: string; delta: number }[], transaction?: any): Promise<void> {
    const db = getUnifiedDb();
    const operation = async (t: Transaction) => {
      const productIds = new Set<string>(updates.map(u => u.id));
      const snapshots = await Promise.all(Array.from(productIds).map(id => t.get(doc(db, this.collectionName, id))));
      const productMap = new Map<string, any>();
      snapshots.forEach(snap => { if (snap.exists()) productMap.set(snap.id, snap.data()); });
      for (const id of productIds) {
        if (!productMap.has(id)) throw new ProductNotFoundError(id);
      }

      const accumulatedDeltas: Record<string, number> = {};
      const finalUpdates = new Map<string, any>();

      for (const update of updates) {
        const data = finalUpdates.get(update.id) || productMap.get(update.id);
        if (!data) throw new ProductNotFoundError(update.id);

        const oldProduct = mapDocToProduct(update.id, data);
        const workingData = { ...data };

        if (update.variantId) {
          const variants = [...(workingData.variants || [])];
          const vIdx = variants.findIndex((v: any) => v.id === update.variantId);
          if (vIdx === -1) throw new DomainError(`Variant ${update.variantId} not found in product ${update.id}`);
          const current = variants[vIdx].stock || 0;
          if (current + update.delta < 0) throw new InsufficientStockError(update.id, Math.abs(update.delta), current);
          variants[vIdx].stock = current + update.delta;
          variants[vIdx].updatedAt = serverTimestamp();
          workingData.variants = variants;
          workingData.stock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
        } else {
          const current = workingData.stock || 0;
          if (current + update.delta < 0) throw new InsufficientStockError(update.id, Math.abs(update.delta), current);
          workingData.stock = current + update.delta;
        }

        workingData.updatedAt = serverTimestamp();
        const enriched = applyDerivedFields({ ...workingData, id: update.id });
        finalUpdates.set(update.id, enriched);
        t.update(doc(db, this.collectionName, update.id), enriched);

        const newProduct = mapDocToProduct(update.id, enriched);
        const deltas = getProductStatsDeltas(oldProduct, newProduct);
        Object.entries(deltas).forEach(([path, delta]) => {
          accumulatedDeltas[path] = (accumulatedDeltas[path] || 0) + delta;
        });
      }
      applyStatsDeltas(t, accumulatedDeltas);
    };

    if (transaction) await operation(transaction);
    else await runTransaction(db, operation);
  }

  async batchSetInventory(updates: { id: string; variantId?: string; stock: number }[]): Promise<void> {
    throw new DomainError(`${INVENTORY_PROTOCOL_MSG} Use adjustInventory instead of batchSetInventory.`);
  }

  async batchDelete(ids: string[]): Promise<void> {
    const db = getUnifiedDb();
    await runTransaction(db, async (t: Transaction) => {
      const accumulatedDeltas: Record<string, number> = {};
      for (const id of ids) {
        const docRef = doc(db, this.collectionName, id);
        const snap = await t.get(docRef);
        if (snap.exists()) {
          const product = mapDocToProduct(id, snap.data() as DocumentData);
          t.delete(docRef);
          const deltas = getProductStatsDeltas(product, null);
          Object.entries(deltas).forEach(([path, delta]) => {
            accumulatedDeltas[path] = (accumulatedDeltas[path] || 0) + delta;
          });
        }
      }
      applyStatsDeltas(t, accumulatedDeltas);
    });
  }

  async batchUpdate(updates: { id: string; updates: ProductUpdate }[]): Promise<Product[]> {
    for (const update of updates) {
      rejectDirectStockMutation(update.updates as Record<string, unknown>);
    }
    const db = getUnifiedDb();
    return await runTransaction(db, async (t: Transaction) => {
      const results: Product[] = [];
      const accumulatedDeltas: Record<string, number> = {};

      for (const update of updates) {
        const docRef = doc(db, this.collectionName, update.id);
        const docSnap = await t.get(docRef);
        if (!docSnap.exists()) continue;

        const currentData = docSnap.data() as any;
        const currentProduct = mapDocToProduct(update.id, currentData);
        
        const mergedData = { ...(currentData as any), ...(update.updates as any), id: update.id, updatedAt: serverTimestamp() };
        const enriched = applyDerivedFields(mergedData);
        t.update(docRef, enriched);
        
        const updatedProduct = mapDocToProduct(update.id, enriched);
        const deltas = getProductStatsDeltas(currentProduct, updatedProduct);
        Object.entries(deltas).forEach(([path, delta]) => {
          accumulatedDeltas[path] = (accumulatedDeltas[path] || 0) + delta;
        });
        results.push(updatedProduct);
      }
      applyStatsDeltas(t, accumulatedDeltas);
      return results;
    });
  }

  async getStats(): Promise<ProductStats> {
    const db = getUnifiedDb();
    const statsSnap = await getDoc(doc(db, STATS_DOC_PATH));
    if (!statsSnap.exists()) return initializeProductStats(this.collectionName, mapDocToProduct);
    return statsSnap.data() as ProductStats;
  }

  async getDetailedStats(): Promise<ProductStats> { return this.getStats(); }

  async getLowStockProducts(limitVal: number): Promise<Product[]> {
    const q = query(
      collection(getUnifiedDb(), this.collectionName), 
      where('status', '==', 'active'),
      where('stock', '<', 10),
      orderBy('stock', 'asc'),
      limit(limitVal)
    );
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d: QueryDocumentSnapshot) => mapDocToProduct(d.id, d.data() as DocumentData));
    } catch (err) {
      logger.error('Failed to fetch low stock products', err);
      const fallback = query(collection(getUnifiedDb(), this.collectionName), where('status', '==', 'active'), limit(limitVal));
      const snap = await getDocs(fallback);
      return snap.docs.map((d: QueryDocumentSnapshot) => mapDocToProduct(d.id, d.data())).filter((p: Product) => p.stock < 10).sort((a: Product, b: Product) => a.stock - b.stock);
    }
  }

  private async ensureUniqueHandle(handle: string, excludeId?: string): Promise<string> {
    let current = handle;
    for (let i = 0; i < 10; i++) {
      const q = query(collection(getUnifiedDb(), this.collectionName), where('handle', '==', current), limit(1));
      const snap = await getDocs(q);
      if (snap.empty || (excludeId && snap.docs[0].id === excludeId)) return current;
      current = `${handle}-${i + 1}`;
    }
    return `${handle}-${crypto.randomUUID().slice(0, 4)}`;
  }
}
