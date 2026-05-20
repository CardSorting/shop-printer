import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscountService } from './DiscountService';

describe('DiscountService hardening', () => {
  let discountRepo: any;
  let service: DiscountService;

  beforeEach(() => {
    discountRepo = {
      getByCode: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new DiscountService(discountRepo, { record: vi.fn() } as any);
  });

  it('only applies product-scoped percentage discounts to eligible line items', async () => {
    discountRepo.getByCode.mockResolvedValue({
      id: 'discount-1',
      code: 'CARD10',
      type: 'percentage',
      value: 10,
      status: 'active',
      startsAt: new Date(Date.now() - 1000),
      endsAt: null,
      usageLimit: null,
      usageCount: 0,
      oncePerCustomer: false,
      selectionType: 'specific_products',
      selectedProductIds: ['p1'],
      selectedCollectionIds: [],
      minimumRequirementType: 'none',
      combinesWith: {
        orderDiscounts: false,
        productDiscounts: false,
        shippingDiscounts: false,
      },
    });

    const result = await service.validateDiscount('CARD10', 3000, 'user-1', undefined, [], {
      lineItems: [
        { productId: 'p1', quantity: 1, unitPrice: 1000 },
        { productId: 'p2', quantity: 1, unitPrice: 2000 },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(100);
  });

  it('fails closed for scoped discounts without cart line-item context', async () => {
    discountRepo.getByCode.mockResolvedValue({
      id: 'discount-1',
      code: 'CARD10',
      type: 'percentage',
      value: 10,
      status: 'active',
      startsAt: new Date(Date.now() - 1000),
      endsAt: null,
      usageLimit: null,
      usageCount: 0,
      oncePerCustomer: false,
      selectionType: 'specific_products',
      selectedProductIds: ['p1'],
      selectedCollectionIds: [],
      minimumRequirementType: 'none',
      combinesWith: {
        orderDiscounts: false,
        productDiscounts: false,
        shippingDiscounts: false,
      },
    });

    const result = await service.validateDiscount('CARD10', 3000);

    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/does not apply/);
  });

  it('rejects invalid full discount state during partial updates', async () => {
    discountRepo.getById.mockResolvedValue({
      id: 'discount-1',
      code: 'SAVE10',
      type: 'percentage',
      value: 10,
      status: 'active',
      isAutomatic: false,
      selectionType: 'all_products',
      selectedProductIds: [],
      selectedCollectionIds: [],
      minimumRequirementType: 'none',
      minimumAmount: null,
      minimumQuantity: null,
      eligibilityType: 'everyone',
      eligibleCustomerIds: [],
      eligibleCustomerSegments: [],
      usageLimit: null,
      usageCount: 0,
      oncePerCustomer: false,
      combinesWith: {
        orderDiscounts: false,
        productDiscounts: false,
        shippingDiscounts: false,
      },
      startsAt: new Date(),
      endsAt: null,
      createdAt: new Date(),
    });

    await expect(service.updateDiscount('discount-1', { value: 500 }, { id: 'admin', email: 'admin@example.com' }))
      .rejects
      .toThrow('Percentage discounts must be between 1 and 100');
  });
});
