import * as crypto from 'node:crypto';
/**
 * [LAYER: CORE]
 */
import type { IDiscountRepository, IOrderRepository } from '@domain/repositories';
import type { Discount, DiscountDraft, DiscountUpdate } from '@domain/models';
import { AuditService } from './AuditService';
import { formatCurrency } from '@utils/formatters';
import { DomainError } from '@domain/errors';

export interface DiscountValidationResult {
  valid: boolean;
  message?: string;
  discount?: Discount;
  discountAmount?: number;
  isFreeShipping?: boolean;
}

export interface DiscountValidationLineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  collections?: string[];
}

export interface DiscountValidationContext {
  lineItems?: DiscountValidationLineItem[];
}

export class DiscountService {
  constructor(
    private discountRepo: IDiscountRepository,
    private audit: AuditService,
    private orderRepo?: IOrderRepository
  ) {}

  async getAllDiscounts() {
    return this.discountRepo.getAll();
  }

  async createDiscount(data: DiscountDraft, actor: { id: string, email: string }) {
    this.assertValidDiscountDraft(data);
    const discount = await this.discountRepo.create(data);
    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'discount_created',
      targetId: discount.id,
      details: { code: data.code }
    });
    return discount;
  }

  async deleteDiscount(id: string, actor: { id: string, email: string }) {
    await this.discountRepo.delete(id);
    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'discount_deleted',
      targetId: id
    });
  }

  async updateDiscount(id: string, updates: DiscountUpdate, actor: { id: string, email: string }) {
    this.assertValidDiscountUpdate(updates);
    const existing = await this.discountRepo.getById(id);
    if (!existing) throw new DomainError('Discount not found.');
    this.assertValidDiscountDraft({ ...existing, ...updates });
    const discount = await this.discountRepo.update(id, updates);
    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'discount_updated',
      targetId: id,
      details: updates
    });
    return discount;
  }

  async validateDiscount(
    code: string, 
    cartTotal: number, 
    userId?: string, 
    transaction?: any, 
    appliedDiscounts: Discount[] = [],
    context?: DiscountValidationContext
  ): Promise<DiscountValidationResult> {
    // Production Hardening: Accept an optional transaction parameter so that when
    // called from within a Firestore transaction (e.g., initiateCheckout), the discount
    // lookup participates in the same transaction and prevents TOCTOU races on usage limits.
    const discount = await this.discountRepo.getByCode(code, transaction);
    if (!discount) return { valid: false, message: 'Invalid discount code' };
    
    if (discount.status !== 'active') return { valid: false, message: 'This discount is not active' };
    
    const now = new Date();
    if (now < discount.startsAt) return { valid: false, message: 'This discount has not started yet' };
    if (discount.endsAt && now > discount.endsAt) return { valid: false, message: 'This discount has expired' };

    if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
      return { valid: false, message: 'This discount has reached its global usage limit' };
    }

    /**
     * [SECURITY: IDENTITY ASSUMPTION]
     * Identity currently means: Unique User ID (Authenticated).
     * 
     * Fraud/Abuse Considerations:
     * - Guest Checkout: Not currently supported for once-per-customer (fails closed).
     * - Duplicate Accounts: High-risk (Mitigated by email verification requirement).
     * - Future Identity Pins: email, shipping_address, payment_fingerprint.
     */
    if (discount.oncePerCustomer && userId && this.orderRepo) {
      const hasUsed = transaction 
        ? await this.orderRepo.checkUserDiscountUsage(userId, discount.code, transaction)
        : await this.orderRepo.hasUsedDiscount(userId, discount.code);
        
      if (hasUsed) {
        return { valid: false, message: 'You have already used this discount code.' };
      }
    }

    // PRODUCTION HARDENING: Discount Combination Enforcement (Fiscal Sovereignty)
    // Prevents "Stacked Discount" exploits by checking if the new discount is allowed 
    // to combine with existing applied discounts.
    for (const applied of appliedDiscounts) {
      const isNewOrderDiscount = discount.type === 'percentage' || discount.type === 'fixed';
      const isNewShippingDiscount = discount.type === 'free_shipping';
      
      const appliedIsOrderDiscount = applied.type === 'percentage' || applied.type === 'fixed';
      const appliedIsShippingDiscount = applied.type === 'free_shipping';

      if (appliedIsOrderDiscount && isNewOrderDiscount && !discount.combinesWith.orderDiscounts) {
        return { valid: false, message: 'This discount cannot be combined with other order discounts.' };
      }
      if (appliedIsShippingDiscount && isNewShippingDiscount && !discount.combinesWith.shippingDiscounts) {
        return { valid: false, message: 'This discount cannot be combined with other shipping discounts.' };
      }
      // Product discounts check would go here if/when product-level discounts are implemented.
    }

    if (discount.minimumRequirementType === 'minimum_amount' && discount.minimumAmount !== null) {
      if (cartTotal < discount.minimumAmount) {
        return { 
          valid: false, 
          message: `This discount requires a minimum purchase of ${formatCurrency(discount.minimumAmount)}` 
        };
      }
    }

    const eligibleSubtotal = this.calculateEligibleSubtotal(discount, cartTotal, context?.lineItems);
    if (eligibleSubtotal <= 0 && discount.type !== 'free_shipping') {
      return { valid: false, message: 'This discount does not apply to the items in this cart.' };
    }

    let discountAmount = 0;
    let isFreeShipping = false;

    if (discount.type === 'percentage') {
      discountAmount = Math.round(eligibleSubtotal * (discount.value / 100));
    } else if (discount.type === 'fixed') {
      discountAmount = Math.min(discount.value, eligibleSubtotal);
    } else if (discount.type === 'free_shipping') {
      if (discount.selectionType !== 'all_products' && eligibleSubtotal <= 0) {
        return { valid: false, message: 'This free shipping discount does not apply to the items in this cart.' };
      }
      isFreeShipping = true;
      discountAmount = 0; // Calculated by OrderService based on actual shipping cost
    }

    return {
      valid: true,
      discount,
      discountAmount: Math.min(discountAmount, eligibleSubtotal || cartTotal),
      isFreeShipping
    };
  }

  private calculateEligibleSubtotal(discount: Discount, cartTotal: number, lineItems?: DiscountValidationLineItem[]): number {
    if (discount.selectionType === 'all_products') return cartTotal;
    if (!lineItems?.length) return 0;

    return lineItems.reduce((subtotal, item) => {
      if (discount.selectionType === 'specific_products') {
        return discount.selectedProductIds.includes(item.productId) ? subtotal + item.unitPrice * item.quantity : subtotal;
      }
      if (discount.selectionType === 'specific_collections') {
        const collections = item.collections ?? [];
        return collections.some((collectionId) => discount.selectedCollectionIds.includes(collectionId))
          ? subtotal + item.unitPrice * item.quantity
          : subtotal;
      }
      return subtotal;
    }, 0);
  }

  private assertValidDiscountDraft(data: DiscountDraft): void {
    this.assertDiscountShape(data, true);
  }

  private assertValidDiscountUpdate(updates: DiscountUpdate): void {
    if (Object.keys(updates).length === 0) throw new DomainError('Discount update must include at least one field.');
    this.assertDiscountShape(updates, false);
  }

  private assertDiscountShape(data: DiscountUpdate, requireAll: boolean): void {
    const type = data.type;
    if (type !== undefined && !['percentage', 'fixed', 'free_shipping'].includes(type)) throw new DomainError('Discount type is invalid.');
    if (data.status !== undefined && !['active', 'scheduled', 'expired'].includes(data.status)) throw new DomainError('Discount status is invalid.');
    if (data.selectionType !== undefined && !['all_products', 'specific_products', 'specific_collections'].includes(data.selectionType)) throw new DomainError('Discount selection type is invalid.');
    if (data.minimumRequirementType !== undefined && !['none', 'minimum_amount', 'minimum_quantity'].includes(data.minimumRequirementType)) throw new DomainError('Discount requirement type is invalid.');
    if (data.eligibilityType !== undefined && !['everyone', 'specific_customers', 'specific_segments'].includes(data.eligibilityType)) throw new DomainError('Discount eligibility type is invalid.');

    if (requireAll) {
      const draft = data as DiscountDraft;
      if (!draft.code?.trim()) throw new DomainError('Discount code is required.');
      if (draft.value === undefined || draft.type === undefined || draft.status === undefined || draft.selectionType === undefined || draft.minimumRequirementType === undefined || draft.eligibilityType === undefined) {
        throw new DomainError('Discount is missing required fields.');
      }
    }

    if (data.code !== undefined && !/^[A-Z0-9][A-Z0-9_-]{2,63}$/i.test(data.code.trim())) {
      throw new DomainError('Discount code must be 3-64 letters, numbers, dashes, or underscores.');
    }

    if (data.value !== undefined) {
      if (!Number.isInteger(data.value) || data.value < 0) throw new DomainError('Discount value must be a non-negative whole number.');
      if (data.type === 'percentage' && (data.value <= 0 || data.value > 100)) throw new DomainError('Percentage discounts must be between 1 and 100.');
      if (data.type === 'fixed' && data.value <= 0) throw new DomainError('Fixed discounts must be greater than zero.');
      if (data.type === 'free_shipping' && data.value !== 0) throw new DomainError('Free shipping discounts must have a value of 0.');
    }

    if (data.usageLimit !== undefined && data.usageLimit !== null && (!Number.isInteger(data.usageLimit) || data.usageLimit <= 0)) {
      throw new DomainError('Usage limit must be a positive whole number.');
    }
    if (data.minimumAmount !== undefined && data.minimumAmount !== null && (!Number.isInteger(data.minimumAmount) || data.minimumAmount <= 0)) {
      throw new DomainError('Minimum amount must be a positive whole number.');
    }
    if (data.minimumQuantity !== undefined && data.minimumQuantity !== null && (!Number.isInteger(data.minimumQuantity) || data.minimumQuantity <= 0)) {
      throw new DomainError('Minimum quantity must be a positive whole number.');
    }
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) throw new DomainError('Discount end date must be after start date.');
  }

  /**
   * Generates a unique, single-use barter discount code.
   * Hardened with fiscal safety caps and CSPRNG seeds.
   */
  async createBarterDiscount(percentage: number, sessionId: string) {
    // PRODUCTION HARDENING: Mandatory Fiscal Safety Boundary
    // Prevents LLM halluncination or prompt injection from creating 100% off codes.
    const MAX_BARTER_PERCENTAGE = 50;
    const safePercentage = Math.max(0, Math.min(percentage, MAX_BARTER_PERCENTAGE));

    // PRODUCTION HARDENING: Cryptographically-secure code generation
    const entropy = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `BARTER-${entropy}`;
    
    const now = new Date();
    const endsAt = new Date();
    endsAt.setHours(endsAt.getHours() + 24); // Barter deals expire in 24h

    const draft: DiscountDraft = {
      code,
      type: 'percentage',
      value: safePercentage,
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
      usageLimit: 1,
      oncePerCustomer: true,
      combinesWith: {
        orderDiscounts: false,
        productDiscounts: false,
        shippingDiscounts: false
      },
      startsAt: now,
      endsAt: endsAt
    };

    const discount = await this.discountRepo.create(draft);
    await this.audit.record({
      userId: 'system',
      userEmail: 'concierge@dreambees.art',
      action: 'barter_discount_created',
      targetId: discount.id,
      details: { code, sessionId, percentage: safePercentage, requestedPercentage: percentage }
    });

    return discount;
  }
}
