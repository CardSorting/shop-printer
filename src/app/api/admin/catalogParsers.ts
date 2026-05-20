import type { Address, Collection, ProductCategory, ProductType, Supplier } from '@domain/models';
import { DomainError } from '@domain/errors';
import { optionalString, parseBoundedLimit, requireString } from '@infrastructure/server/apiGuards';

const COLLECTION_STATUSES = new Set<Collection['status']>(['active', 'archived', 'draft']);
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CollectionDraftInput = Pick<Collection, 'name'> & Partial<Pick<Collection, 'handle' | 'description' | 'imageUrl' | 'status'>>;
export type CollectionUpdateInput = Partial<Pick<Collection, 'name' | 'handle' | 'description' | 'imageUrl' | 'status'>>;
export type SupplierDraftInput = Pick<Supplier, 'name'> & Partial<Pick<Supplier, 'contactName' | 'email' | 'phone' | 'website' | 'address' | 'notes'>>;
export type SupplierUpdateInput = Partial<Pick<Supplier, 'name' | 'contactName' | 'email' | 'phone' | 'website' | 'address' | 'notes'>>;
export type ProductCategoryInput = Pick<ProductCategory, 'name'> & Partial<Pick<ProductCategory, 'id' | 'slug' | 'description'>>;
export type ProductTypeInput = Pick<ProductType, 'name'> & Partial<Pick<ProductType, 'id'>>;

export function parseCollectionListOptions(searchParams: URLSearchParams): { status?: Collection['status']; limit?: number } {
  return {
    status: parseCollectionStatus(searchParams.get('status'), false),
    limit: parseBoundedLimit(searchParams.get('limit'), 50, 100),
  };
}

export function parseSupplierListOptions(searchParams: URLSearchParams): { query?: string; limit?: number } {
  return {
    query: optionalString(searchParams.get('query'), 'query'),
    limit: parseBoundedLimit(searchParams.get('limit'), 50, 100),
  };
}

export function parseCollectionDraft(body: Record<string, unknown>): CollectionDraftInput {
  const draft: CollectionDraftInput = {
    name: requireString(body.name, 'name'),
    handle: parseHandle(body.handle, 'handle', false),
    description: optionalString(body.description, 'description'),
    imageUrl: optionalString(body.imageUrl, 'imageUrl'),
    status: parseCollectionStatus(body.status, false) ?? 'active',
  };
  return stripUndefined(draft) as CollectionDraftInput;
}

export function parseCollectionUpdate(body: Record<string, unknown>): CollectionUpdateInput {
  const update: CollectionUpdateInput = {
    name: optionalString(body.name, 'name'),
    handle: parseHandle(body.handle, 'handle', false),
    description: optionalString(body.description, 'description'),
    imageUrl: optionalString(body.imageUrl, 'imageUrl'),
    status: parseCollectionStatus(body.status, false),
  };
  const clean = stripUndefined(update) as CollectionUpdateInput;
  if (Object.keys(clean).length === 0) throw new DomainError('At least one collection field is required.');
  return clean;
}

export function parseSupplierDraft(body: Record<string, unknown>): SupplierDraftInput {
  const draft: SupplierDraftInput = {
    name: requireString(body.name, 'name'),
    contactName: optionalString(body.contactName, 'contactName'),
    email: parseEmail(body.email),
    phone: optionalString(body.phone, 'phone'),
    website: parseUrl(body.website, 'website'),
    address: parseOptionalAddress(body.address),
    notes: optionalString(body.notes, 'notes'),
  };
  return stripUndefined(draft) as SupplierDraftInput;
}

export function parseSupplierUpdate(body: Record<string, unknown>): SupplierUpdateInput {
  const update: SupplierUpdateInput = {
    name: optionalString(body.name, 'name'),
    contactName: optionalString(body.contactName, 'contactName'),
    email: parseEmail(body.email),
    phone: optionalString(body.phone, 'phone'),
    website: parseUrl(body.website, 'website'),
    address: parseOptionalAddress(body.address),
    notes: optionalString(body.notes, 'notes'),
  };
  const clean = stripUndefined(update) as SupplierUpdateInput;
  if (Object.keys(clean).length === 0) throw new DomainError('At least one supplier field is required.');
  return clean;
}

export function parseProductCategoryInput(body: Record<string, unknown>): ProductCategoryInput {
  const category: ProductCategoryInput = {
    id: optionalString(body.id, 'id'),
    name: requireString(body.name, 'name'),
    slug: parseHandle(body.slug, 'slug', false),
    description: optionalNullableString(body.description, 'description'),
  };
  return stripUndefined(category) as ProductCategoryInput;
}

export function parseProductTypeInput(body: Record<string, unknown>): ProductTypeInput {
  const type: ProductTypeInput = {
    id: optionalString(body.id, 'id'),
    name: requireString(body.name, 'name'),
  };
  return stripUndefined(type) as ProductTypeInput;
}

function parseCollectionStatus(value: unknown, required: true): Collection['status'];
function parseCollectionStatus(value: unknown, required?: false): Collection['status'] | undefined;
function parseCollectionStatus(value: unknown, required = false): Collection['status'] | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw new DomainError('status is required.');
    return undefined;
  }
  if (typeof value === 'string' && COLLECTION_STATUSES.has(value as Collection['status'])) {
    return value as Collection['status'];
  }
  throw new DomainError('Collection status is invalid.');
}

function parseHandle(value: unknown, field: string, required: true): string;
function parseHandle(value: unknown, field: string, required?: false): string | undefined;
function parseHandle(value: unknown, field: string, required = false): string | undefined {
  const raw = required ? requireString(value, field) : optionalString(value, field);
  if (!raw) return undefined;
  const handle = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (!handle || !HANDLE_PATTERN.test(handle)) throw new DomainError(`${field} must contain letters or numbers.`);
  return handle;
}

function parseEmail(value: unknown): string | undefined {
  const email = optionalString(value, 'email');
  if (!email) return undefined;
  const normalized = email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new DomainError('email must be a valid email address.');
  return normalized;
}

function parseUrl(value: unknown, field: string): string | undefined {
  const raw = optionalString(value, field);
  if (!raw) return undefined;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new DomainError(`${field} must be a valid URL.`);
  }
  if (!['https:', 'http:'].includes(url.protocol)) throw new DomainError(`${field} must use http or https.`);
  return url.toString();
}

function parseOptionalAddress(value: unknown): Address | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) throw new DomainError('address must be a JSON object.');
  const body = value as Record<string, unknown>;
  return {
    street: requireString(body.street, 'address.street'),
    city: requireString(body.city, 'address.city'),
    state: requireString(body.state, 'address.state'),
    zip: requireString(body.zip, 'address.zip'),
    country: requireString(body.country, 'address.country').toUpperCase(),
  };
}

function optionalNullableString(value: unknown, field: string): string | null | undefined {
  if (value === null) return null;
  return optionalString(value, field);
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}
