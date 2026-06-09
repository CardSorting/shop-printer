import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartService } from './CartService';
import { ProductNotFoundError } from '@domain/errors';

// Mock the bridge
vi.mock('@infrastructure/firebase/bridge', () => ({
  runTransaction: vi.fn((db, fn) => fn({
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  })),
  getUnifiedDb: vi.fn(() => ({})),
}));

describe('CartService', () => {
  let cartService: CartService;
  let mockCartRepo: any;
  let mockProductRepo: any;

  beforeEach(() => {
    mockCartRepo = {
      getByUserId: vi.fn(),
      save: vi.fn(),
      clear: vi.fn(),
    };
    mockProductRepo = {
      getById: vi.fn(),
    };
    cartService = new CartService(mockCartRepo, mockProductRepo);
  });

  describe('addToCart', () => {
    it('should add an item to an empty cart', async () => {
      const mockProduct = { id: 'p1', name: 'Product 1', price: 1000, stock: 10 };
      mockProductRepo.getById.mockResolvedValue(mockProduct);
      mockCartRepo.getByUserId.mockResolvedValue(null); // Empty cart

      const cart = await cartService.addToCart('u1', 'p1', 2);

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].productId).toBe('p1');
      expect(cart.items[0].quantity).toBe(2);
      expect(mockCartRepo.save).toHaveBeenCalled();
    });

    it('should increment quantity if item already in cart', async () => {
      const mockProduct = { id: 'p1', name: 'Product 1', price: 1000, stock: 10 };
      mockProductRepo.getById.mockResolvedValue(mockProduct);
      mockCartRepo.getByUserId.mockResolvedValue({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1, name: 'Product 1', priceSnapshot: 1000, imageUrl: '' }]
      });

      const cart = await cartService.addToCart('u1', 'p1', 2);

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(3);
    });

    it('should throw error if product not found', async () => {
      mockProductRepo.getById.mockResolvedValue(null);
      await expect(cartService.addToCart('u1', 'p1', 1)).rejects.toThrow(ProductNotFoundError);
    });

    it('should reject add when inventory protocol reports insufficient stock', async () => {
      const mockProduct = { id: 'p1', name: 'Product 1', price: 1000, stock: 10 };
      mockProductRepo.getById.mockResolvedValue(mockProduct);
      mockCartRepo.getByUserId.mockResolvedValue(null);
      const inventory = {
        checkAvailability: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            available: false,
            lines: [{ productId: 'p1', requested: 2, available: 1, sufficient: false }],
          },
        }),
      };
      cartService = new CartService(mockCartRepo, mockProductRepo, inventory);

      await expect(cartService.addToCart('u1', 'p1', 2)).rejects.toThrow('Insufficient stock');
      expect(mockCartRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('removeFromCart', () => {
    it('should remove an item from the cart', async () => {
      mockCartRepo.getByUserId.mockResolvedValue({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1, name: 'Product 1', priceSnapshot: 1000, imageUrl: '' }]
      });

      const cart = await cartService.removeFromCart('u1', 'p1');

      expect(cart.items).toHaveLength(0);
      expect(mockCartRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateQuantity', () => {
    it('should treat quantity zero as item removal without requiring product lookup', async () => {
      mockCartRepo.getByUserId.mockResolvedValue({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1, name: 'Product 1', priceSnapshot: 1000, imageUrl: '' }]
      });

      const cart = await cartService.updateQuantity('u1', 'p1', 0);

      expect(cart.items).toHaveLength(0);
      expect(mockProductRepo.getById).not.toHaveBeenCalled();
      expect(mockCartRepo.save).toHaveBeenCalled();
    });
  });

  describe('clearCart', () => {
    it('should call clear on repo', async () => {
      await cartService.clearCart('u1');
      expect(mockCartRepo.clear).toHaveBeenCalledWith('u1');
    });
  });

  describe('restoreCartIfEmpty', () => {
    it('should restore a cart when no active cart exists', async () => {
      mockCartRepo.getByUserId.mockResolvedValue(null);
      const restored = await cartService.restoreCartIfEmpty({
        id: 'u1',
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1, name: 'Product 1', priceSnapshot: 1000, imageUrl: '' }],
        updatedAt: new Date()
      });

      expect(restored).toBe(true);
      expect(mockCartRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1, name: 'Product 1', priceSnapshot: 1000, imageUrl: '' }]
      }), expect.anything());
    });

    it('should not overwrite an active cart during rollback restore', async () => {
      mockCartRepo.getByUserId.mockResolvedValue({
        id: 'u1',
        userId: 'u1',
        items: [{ productId: 'p2', quantity: 1, name: 'Product 2', priceSnapshot: 2000, imageUrl: '' }],
        updatedAt: new Date()
      });

      const restored = await cartService.restoreCartIfEmpty({
        id: 'u1',
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1, name: 'Product 1', priceSnapshot: 1000, imageUrl: '' }],
        updatedAt: new Date()
      });

      expect(restored).toBe(false);
      expect(mockCartRepo.save).not.toHaveBeenCalled();
    });
  });
});
