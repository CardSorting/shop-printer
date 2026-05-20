import { DomainError } from '@domain/errors';
import type {
  DiscountDraft,
  DiscountEligibilityType,
  DiscountRequirementType,
  DiscountSelectionType,
  DiscountStatus,
  DiscountType,
  DiscountUpdate,
} from '@domain/models';
import {
  optionalBoolean,
  optionalInteger,
  optionalStringArray,
  requireInteger,
  requireString,
} from '@infrastructure/server/apiGuards';

const DISCOUNT_TYPES = new Set<DiscountType>(['percentage', 'fixed', 'free_shipping']);
const DISCOUNT_STATUSES = new Set<DiscountStatus>(['active', 'scheduled', 'expired']);
const SELECTION_TYPES = new Set<DiscountSelectionType>(['all_products', 'specific_products', 'specific_collections']);
const REQUIREMENT_TYPES = new Set<DiscountRequirementType>(['none', 'minimum_amount', 'minimum_quantity']);
const ELIGIBILITY_TYPES = new Set<DiscountEligibilityType>(['everyone', 'specific_customers', 'specific_segments']);

function parseEnum<T extends string>(value: unknown, field: string, allowed: Set<T>): T {
  if (typeof value === 'string' && allowed.has(value as T)) return value as T;
  throw new DomainError(`${field} is invalid.`);
}

function parseOptionalEnum<T extends string>(value: unknown, field: string, allowed: Set<T>): T | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return parseEnum(value, field, allowed);
}

function parseDate(value: unknown, field: string): Date {
  if (value instanceof Date) return value;
  if (typeof value !== 'string' && typeof value !== 'number') throw new DomainError(`${field} must be a valid date.`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new DomainError(`${field} must be a valid date.`);
  return date;
}

function parseOptionalDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return parseDate(value, field);
}

function parseCode(value: unknown): string {
  const code = requireString(value, 'code').toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(code)) {
    throw new DomainError('Discount code must be 3-64 letters, numbers, dashes, or underscores.');
  }
  return code;
}

function parsePositiveIntegerOrNull(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = requireInteger(value, field);
  if (parsed <= 0) throw new DomainError(`${field} must be a positive whole number.`);
  return parsed;
}

function parsePositiveInteger(value: unknown, field: string): number {
  const parsed = requireInteger(value, field);
  if (parsed <= 0) throw new DomainError(`${field} must be a positive whole number.`);
  return parsed;
}

function parseDiscountValue(type: DiscountType, value: unknown): number {
  if (type === 'free_shipping') return 0;
  const parsed = parsePositiveInteger(value, 'value');
  if (type === 'percentage' && parsed > 100) throw new DomainError('Percentage discounts cannot exceed 100.');
  return parsed;
}

function parseCombinesWith(value: unknown): DiscountDraft['combinesWith'] {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    orderDiscounts: optionalBoolean(source.orderDiscounts, 'combinesWith.orderDiscounts') ?? false,
    productDiscounts: optionalBoolean(source.productDiscounts, 'combinesWith.productDiscounts') ?? false,
    shippingDiscounts: optionalBoolean(source.shippingDiscounts, 'combinesWith.shippingDiscounts') ?? false,
  };
}

function assertTemporalWindow(startsAt?: Date, endsAt?: Date | null): void {
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new DomainError('Discount end date must be after start date.');
  }
}

export function parseDiscountDraft(body: Record<string, unknown>): DiscountDraft {
  const type = parseEnum(body.type, 'type', DISCOUNT_TYPES);
  const minimumRequirementType = parseEnum(body.minimumRequirementType, 'minimumRequirementType', REQUIREMENT_TYPES);
  const startsAt = parseDate(body.startsAt ?? new Date().toISOString(), 'startsAt');
  const endsAt = parseOptionalDate(body.endsAt, 'endsAt') ?? null;
  assertTemporalWindow(startsAt, endsAt);

  return {
    code: parseCode(body.code),
    type,
    value: parseDiscountValue(type, body.value),
    status: parseEnum(body.status ?? 'active', 'status', DISCOUNT_STATUSES),
    isAutomatic: optionalBoolean(body.isAutomatic, 'isAutomatic') ?? false,
    selectionType: parseEnum(body.selectionType, 'selectionType', SELECTION_TYPES),
    selectedProductIds: optionalStringArray(body.selectedProductIds, 'selectedProductIds') ?? [],
    selectedCollectionIds: optionalStringArray(body.selectedCollectionIds, 'selectedCollectionIds') ?? [],
    minimumRequirementType,
    minimumAmount: minimumRequirementType === 'minimum_amount' ? parsePositiveIntegerOrNull(body.minimumAmount, 'minimumAmount') : null,
    minimumQuantity: minimumRequirementType === 'minimum_quantity' ? parsePositiveIntegerOrNull(body.minimumQuantity, 'minimumQuantity') : null,
    eligibilityType: parseEnum(body.eligibilityType, 'eligibilityType', ELIGIBILITY_TYPES),
    eligibleCustomerIds: optionalStringArray(body.eligibleCustomerIds, 'eligibleCustomerIds') ?? [],
    eligibleCustomerSegments: optionalStringArray(body.eligibleCustomerSegments, 'eligibleCustomerSegments') ?? [],
    usageLimit: parsePositiveIntegerOrNull(body.usageLimit, 'usageLimit'),
    oncePerCustomer: optionalBoolean(body.oncePerCustomer, 'oncePerCustomer') ?? false,
    combinesWith: parseCombinesWith(body.combinesWith),
    startsAt,
    endsAt,
  };
}

export function parseDiscountUpdate(body: Record<string, unknown>): DiscountUpdate {
  const update: DiscountUpdate = {};

  if ('code' in body) update.code = parseCode(body.code);
  if ('type' in body) update.type = parseEnum(body.type, 'type', DISCOUNT_TYPES);
  if ('value' in body) {
    const type = update.type ?? parseOptionalEnum(body.type, 'type', DISCOUNT_TYPES) ?? 'fixed';
    update.value = parseDiscountValue(type, body.value);
  }
  if ('status' in body) update.status = parseEnum(body.status, 'status', DISCOUNT_STATUSES);
  if ('isAutomatic' in body) update.isAutomatic = optionalBoolean(body.isAutomatic, 'isAutomatic') ?? false;
  if ('selectionType' in body) update.selectionType = parseEnum(body.selectionType, 'selectionType', SELECTION_TYPES);
  if ('selectedProductIds' in body) update.selectedProductIds = optionalStringArray(body.selectedProductIds, 'selectedProductIds') ?? [];
  if ('selectedCollectionIds' in body) update.selectedCollectionIds = optionalStringArray(body.selectedCollectionIds, 'selectedCollectionIds') ?? [];
  if ('minimumRequirementType' in body) update.minimumRequirementType = parseEnum(body.minimumRequirementType, 'minimumRequirementType', REQUIREMENT_TYPES);
  if ('minimumAmount' in body) update.minimumAmount = parsePositiveIntegerOrNull(body.minimumAmount, 'minimumAmount');
  if ('minimumQuantity' in body) update.minimumQuantity = parsePositiveIntegerOrNull(body.minimumQuantity, 'minimumQuantity');
  if ('eligibilityType' in body) update.eligibilityType = parseEnum(body.eligibilityType, 'eligibilityType', ELIGIBILITY_TYPES);
  if ('eligibleCustomerIds' in body) update.eligibleCustomerIds = optionalStringArray(body.eligibleCustomerIds, 'eligibleCustomerIds') ?? [];
  if ('eligibleCustomerSegments' in body) update.eligibleCustomerSegments = optionalStringArray(body.eligibleCustomerSegments, 'eligibleCustomerSegments') ?? [];
  if ('usageLimit' in body) update.usageLimit = parsePositiveIntegerOrNull(body.usageLimit, 'usageLimit');
  if ('oncePerCustomer' in body) update.oncePerCustomer = optionalBoolean(body.oncePerCustomer, 'oncePerCustomer') ?? false;
  if ('combinesWith' in body) update.combinesWith = parseCombinesWith(body.combinesWith);
  if ('startsAt' in body) update.startsAt = parseDate(body.startsAt, 'startsAt');
  if ('endsAt' in body) update.endsAt = parseOptionalDate(body.endsAt, 'endsAt') ?? null;

  if (Object.keys(update).length === 0) throw new DomainError('Discount update must include at least one field.');
  assertTemporalWindow(update.startsAt, update.endsAt);
  return update;
}
