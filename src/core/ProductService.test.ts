import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from './ProductService';
import { ProductNotFoundError } from '@domain/errors';

describe('ProductService', () => {
  let productService: ProductService;
  let mockRepo: any;
  let mockAudit: any;

  let mockInventory: any;

  beforeEach(() => {
    mockRepo = {
      getAll: vi.fn(),
      getById: vi.fn(),
      getByHandle: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getStats: vi.fn(),
    };
    mockAudit = {
      record: vi.fn(),
    };
    mockInventory = {
      adjustInventory: vi.fn().mockResolvedValue({ ok: true, data: { adjustments: [] } }),
    };
    productService = new ProductService(mockRepo, mockAudit, mockInventory);
  });

  describe('getProducts', () => {
    it('should return sanitized products', async () => {
      mockRepo.getAll.mockResolvedValue({
        products: [
          { id: 'p1', name: 'Product 1', price: 1000, stock: 10, category: 'Art' }
        ],
        nextCursor: null
      });

      const result = await productService.getProducts();

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Product 1');
    });
  });

  describe('createProduct', () => {
    it('should create a product and record audit', async () => {
      const draft = {
        name: 'New Product',
        description: 'Desc',
        price: 5000,
        stock: 10,
        category: 'Art',
        imageUrl: 'http://image.png'
      };
      const created = { ...draft, id: 'p1', stock: 0 };
      mockRepo.create.mockResolvedValue(created);

      const result = await productService.createProduct(draft as any, { id: 'admin', email: 'admin@test.com' });

      expect(result.id).toBe('p1');
      expect(result.stock).toBe(10);
      expect(mockRepo.create).toHaveBeenCalledWith({ ...draft, stock: 0 });
      expect(mockInventory.adjustInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          updates: [{ productId: 'p1', stock: 10 }],
          actor: 'admin',
        }),
      );
      expect(mockAudit.record).toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    it('should delete and record audit', async () => {
      await productService.deleteProduct('p1', { id: 'admin', email: 'admin@test.com' });
      expect(mockRepo.delete).toHaveBeenCalledWith('p1');
      expect(mockAudit.record).toHaveBeenCalled();
    });
  });

  describe('getProduct', () => {
    it('should throw if not found', async () => {
      mockRepo.getById.mockResolvedValue(null);
      await expect(productService.getProduct('p1')).rejects.toThrow(ProductNotFoundError);
    });
  });
});
