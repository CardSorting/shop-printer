import { describe, it, expect } from 'vitest';
import { 
  calculateGrossMarginPercent, 
  classifyMarginHealth, 
  calculateCartTotal, 
  validateCartItem, 
  classifyInventoryHealth, 
  formatCents,
  MAX_CART_QUANTITY,
  assertValidProductDraft,
  purchaseOrderRules,
  inventoryRules
} from './rules';
import type { Product, CartItem } from './models';

describe('Domain Rules', () => {
  describe('calculateGrossMarginPercent', () => {
    it('should calculate correct margin percentage', () => {
      const product = { price: 10000, cost: 6000 } as Product;
      expect(calculateGrossMarginPercent(product)).toBe(40);
    });

    it('should return null if cost is missing or zero', () => {
      expect(calculateGrossMarginPercent({ price: 1000, cost: 0 } as Product)).toBeNull();
      expect(calculateGrossMarginPercent({ price: 1000 } as Product)).toBeNull();
    });

    it('should return null if price is zero', () => {
      expect(calculateGrossMarginPercent({ price: 0, cost: 500 } as Product)).toBeNull();
    });
  });

  describe('classifyMarginHealth', () => {
    it('should classify as premium for high margins', () => {
      expect(classifyMarginHealth({ price: 100, cost: 50 } as Product)).toBe('premium');
    });

    it('should classify as healthy for medium margins', () => {
      expect(classifyMarginHealth({ price: 100, cost: 70 } as Product)).toBe('healthy');
    });

    it('should classify as at_risk for low margins', () => {
      expect(classifyMarginHealth({ price: 100, cost: 90 } as Product)).toBe('at_risk');
    });

    it('should classify as unknown if margin cannot be calculated', () => {
      expect(classifyMarginHealth({ price: 0, cost: 50 } as Product)).toBe('unknown');
    });
  });

  describe('calculateCartTotal', () => {
    it('should calculate total for multiple items', () => {
      const items: CartItem[] = [
        { productId: '1', priceSnapshot: 1000, quantity: 2, name: 'A', imageUrl: '' },
        { productId: '2', priceSnapshot: 500, quantity: 3, name: 'B', imageUrl: '' },
      ];
      expect(calculateCartTotal(items)).toBe(3500);
    });

    it('should return 0 for empty cart', () => {
      expect(calculateCartTotal([])).toBe(0);
    });
  });

  describe('validateCartItem', () => {
    const mockProduct = { stock: 10 } as Product;

    it('should return true for valid quantity', () => {
      expect(validateCartItem(mockProduct, 5)).toBe(true);
    });

    it('should return false for quantity <= 0', () => {
      expect(validateCartItem(mockProduct, 0)).toBe(false);
      expect(validateCartItem(mockProduct, -1)).toBe(false);
    });

    it('should return false if quantity exceeds stock', () => {
      expect(validateCartItem(mockProduct, 11)).toBe(false);
    });

    it('should return false if quantity exceeds MAX_CART_QUANTITY', () => {
      expect(validateCartItem(mockProduct, MAX_CART_QUANTITY + 1)).toBe(false);
    });
  });

  describe('classifyInventoryHealth', () => {
    it('should classify as out_of_stock for 0 or less', () => {
      expect(classifyInventoryHealth(0)).toBe('out_of_stock');
      expect(classifyInventoryHealth(-1)).toBe('out_of_stock');
    });

    it('should classify as low_stock for less than 5', () => {
      expect(classifyInventoryHealth(4)).toBe('low_stock');
    });

    it('should classify as healthy for 5 or more', () => {
      expect(classifyInventoryHealth(5)).toBe('healthy');
    });
  });

  describe('assertValidProductDraft', () => {
    const validDraft = {
      name: 'Charizard GX',
      description: 'A powerful fire dragon card.',
      imageUrl: 'http://example.com/image.png',
      price: 5000,
      stock: 10,
      category: 'Pokemon',
      rarity: 'Ultra Rare'
    } as any;

    it('should pass for valid draft', () => {
      expect(() => assertValidProductDraft(validDraft)).not.toThrow();
    });

    it('should throw if name is missing', () => {
      expect(() => assertValidProductDraft({ ...validDraft, name: '' }))
        .toThrow(/Name is required/i);
    });

    it('should throw if price is negative', () => {
      expect(() => assertValidProductDraft({ ...validDraft, price: -1 }))
        .toThrow(/Price must be a non-negative/i);
    });

    it('should throw if stock is negative', () => {
      expect(() => assertValidProductDraft({ ...validDraft, stock: -1 }))
        .toThrow(/Stock must be a non-negative/i);
    });
  });

  describe('purchaseOrderRules', () => {
    it('should determine if PO can be received', () => {
      expect(purchaseOrderRules.canReceive({ status: 'ordered' } as any)).toBe(true);
      expect(purchaseOrderRules.canReceive({ status: 'received' } as any)).toBe(false);
    });

    it('should calculate received status correctly', () => {
      const items = [
        { orderedQty: 10, receivedQty: 10 },
        { orderedQty: 5, receivedQty: 5 },
      ] as any;
      expect(purchaseOrderRules.calculateReceivedStatus(items)).toBe('received');

      const partialItems = [
        { orderedQty: 10, receivedQty: 5 },
        { orderedQty: 5, receivedQty: 0 },
      ] as any;
      expect(purchaseOrderRules.calculateReceivedStatus(partialItems)).toBe('partially_received');
    });

    describe('validateReceiveQty', () => {
      it('should allow receiving within ordered quantity', () => {
        expect(purchaseOrderRules.validateReceiveQty(10, 0, 5)).toBe(true);
        expect(purchaseOrderRules.validateReceiveQty(10, 5, 5)).toBe(true);
      });

      it('should allow overage up to 10%', () => {
        expect(purchaseOrderRules.validateReceiveQty(10, 0, 11)).toBe(true);
        expect(purchaseOrderRules.validateReceiveQty(10, 5, 6)).toBe(true);
      });

      it('should reject overage exceeding 10%', () => {
        expect(purchaseOrderRules.validateReceiveQty(10, 0, 12)).toBe(false);
        expect(purchaseOrderRules.validateReceiveQty(10, 5, 7)).toBe(false);
      });

      it('should reject negative quantities', () => {
        expect(purchaseOrderRules.validateReceiveQty(10, 0, -1)).toBe(false);
      });

      it('should reject non-integer quantities', () => {
        expect(purchaseOrderRules.validateReceiveQty(10, 0, 1.5)).toBe(false);
      });
    });
  });

  describe('inventoryRules', () => {
    it('should detect low stock', () => {
      const level = { availableQty: 2, reorderPoint: 5 } as any;
      expect(inventoryRules.isLowStock(level)).toBe(true);

      const healthyLevel = { availableQty: 10, reorderPoint: 5 } as any;
      expect(inventoryRules.isLowStock(healthyLevel)).toBe(false);
    });

    it('should validate adjustment', () => {
      expect(inventoryRules.canAdjust(10, 2, -5)).toBe(true); // 10+2-5 = 7 >= 0
      expect(inventoryRules.canAdjust(2, 0, -5)).toBe(false); // 2+0-5 = -3 < 0
    });
  });

  describe('formatCents', () => {
    it('should format cents to USD string', () => {
      expect(formatCents(100)).toBe('$1.00');
      expect(formatCents(12345)).toBe('$123.45');
      expect(formatCents(0)).toBe('$0.00');
    });
  });
});
