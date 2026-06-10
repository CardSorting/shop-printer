import type { IProductRepository } from '@domain/repositories';
import type { Product } from '@domain/models';

/**
 * Read-only product access for cart intent — not pricing authority.
 */
export class ProductReadModel {
  constructor(private productRepo: IProductRepository) {}

  async getProduct(productId: string, transaction?: unknown): Promise<Product | null> {
    return this.productRepo.getById(productId, transaction as any);
  }
}
