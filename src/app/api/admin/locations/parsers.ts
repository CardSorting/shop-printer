import { randomUUID } from 'node:crypto';
import type { InventoryLocation, InventoryLocationType } from '@domain/models';
import { DomainError } from '@domain/errors';
import {
  optionalBoolean,
  optionalInteger,
  optionalString,
  requireString,
} from '@infrastructure/server/apiGuards';

const LOCATION_TYPES = new Set<InventoryLocationType>((['warehouse', 'retail', 'virtual']));

type LocationUpdate = Partial<Omit<InventoryLocation, 'id' | 'createdAt'>>;

function boundedString(value: unknown, field: string, maxLength: number, required = false): string | undefined {
  const parsed = required ? requireString(value, field) : optionalString(value, field);
  if (!parsed) return undefined;
  if (parsed.length > maxLength) throw new DomainError(`${field} must be ${maxLength} characters or fewer.`);
  return parsed;
}

function parseLocationType(value: unknown, required = true): InventoryLocationType | undefined {
  const parsed = required ? requireString(value, 'type') : optionalString(value, 'type');
  if (!parsed) return undefined;
  if (!LOCATION_TYPES.has(parsed as InventoryLocationType)) throw new DomainError('type is invalid.');
  return parsed as InventoryLocationType;
}

function parseNonNegativeInteger(value: unknown, field: string): number | undefined {
  const parsed = optionalInteger(value, field);
  if (parsed !== undefined && parsed < 0) throw new DomainError(`${field} must be non-negative.`);
  return parsed;
}

function parseCoordinates(value: unknown): { lat: number; lng: number } | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) throw new DomainError('coordinates must be an object.');
  const coordinates = value as Record<string, unknown>;
  const lat = coordinates.lat;
  const lng = coordinates.lng;
  if (typeof lat !== 'number' || !Number.isFinite(lat)) throw new DomainError('coordinates.lat must be a number.');
  if (typeof lng !== 'number' || !Number.isFinite(lng)) throw new DomainError('coordinates.lng must be a number.');
  if (lat < -90 || lat > 90) throw new DomainError('coordinates.lat must be between -90 and 90.');
  if (lng < -180 || lng > 180) throw new DomainError('coordinates.lng must be between -180 and 180.');
  return { lat, lng };
}

export function parseInventoryLocation(body: Record<string, unknown>): InventoryLocation {
  return {
    id: boundedString(body.id, 'id', 120) ?? randomUUID(),
    name: boundedString(body.name, 'name', 120, true)!,
    type: parseLocationType(body.type)!,
    address: boundedString(body.address, 'address', 500),
    code: boundedString(body.code, 'code', 40),
    isDefault: optionalBoolean(body.isDefault, 'isDefault') ?? false,
    isActive: optionalBoolean(body.isActive, 'isActive') ?? true,
    isPickupLocation: optionalBoolean(body.isPickupLocation, 'isPickupLocation') ?? false,
    pickupInstructions: boundedString(body.pickupInstructions, 'pickupInstructions', 500),
    deliveryRadiusMiles: parseNonNegativeInteger(body.deliveryRadiusMiles, 'deliveryRadiusMiles'),
    deliveryFee: parseNonNegativeInteger(body.deliveryFee, 'deliveryFee'),
    coordinates: parseCoordinates(body.coordinates),
    createdAt: new Date(),
  };
}

export function parseInventoryLocationUpdate(body: Record<string, unknown>): LocationUpdate {
  const update: LocationUpdate = {};
  if ('name' in body) update.name = boundedString(body.name, 'name', 120, true)!;
  if ('type' in body) update.type = parseLocationType(body.type)!;
  if ('address' in body) update.address = boundedString(body.address, 'address', 500);
  if ('code' in body) update.code = boundedString(body.code, 'code', 40);
  if ('isDefault' in body) update.isDefault = optionalBoolean(body.isDefault, 'isDefault') ?? false;
  if ('isActive' in body) update.isActive = optionalBoolean(body.isActive, 'isActive') ?? false;
  if ('isPickupLocation' in body) update.isPickupLocation = optionalBoolean(body.isPickupLocation, 'isPickupLocation') ?? false;
  if ('pickupInstructions' in body) update.pickupInstructions = boundedString(body.pickupInstructions, 'pickupInstructions', 500);
  if ('deliveryRadiusMiles' in body) update.deliveryRadiusMiles = parseNonNegativeInteger(body.deliveryRadiusMiles, 'deliveryRadiusMiles');
  if ('deliveryFee' in body) update.deliveryFee = parseNonNegativeInteger(body.deliveryFee, 'deliveryFee');
  if ('coordinates' in body) update.coordinates = parseCoordinates(body.coordinates);
  if (Object.keys(update).length === 0) throw new DomainError('No location fields provided.');
  return update;
}
