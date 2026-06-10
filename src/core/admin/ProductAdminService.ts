import type { Product, ProductDraft, ProductUpdate } from '@domain/models';
import { ProductService } from '../ProductService';

export type ProductAdminActor = { id: string; email: string };

/**
 * Product catalog mutations for admin operators.
 * Stock changes delegate to the inventory protocol via ProductService.
 */
export class ProductAdminService {
  constructor(private productService: ProductService) {}

  createProduct(data: ProductDraft, actor: ProductAdminActor): Promise<Product> {
    return this.productService.createProduct(data, actor);
  }

  updateProduct(id: string, patch: ProductUpdate, actor: ProductAdminActor): Promise<Product> {
    return this.productService.updateProduct(id, patch, actor);
  }

  archiveProduct(id: string, actor: ProductAdminActor): Promise<void> {
    return this.productService.deleteProduct(id, actor);
  }

  batchUpdateProducts(
    updates: { id: string; updates: ProductUpdate }[],
    actor: ProductAdminActor,
  ): Promise<Product[]> {
    return this.productService.batchUpdateProducts(updates, actor);
  }

  batchArchiveProducts(ids: string[], actor: ProductAdminActor): Promise<void> {
    return this.productService.batchDeleteProducts(ids, actor);
  }

  batchCreateProducts(products: ProductDraft[], actor: ProductAdminActor): Promise<Product[]> {
    return this.productService.batchCreateProducts(products, actor);
  }
}
