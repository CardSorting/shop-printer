import { describe, expect, it } from 'vitest';
import { parseInventoryLocation, parseInventoryLocationUpdate } from './parsers';

describe('admin location parsers', () => {
  it('normalizes a valid inventory location create payload', () => {
    const parsed = parseInventoryLocation({
      name: 'Main Warehouse',
      type: 'warehouse',
      isPickupLocation: true,
      deliveryRadiusMiles: 25,
      deliveryFee: 500,
      coordinates: { lat: 39.7392, lng: -104.9903 },
    });

    expect(parsed).toMatchObject({
      name: 'Main Warehouse',
      type: 'warehouse',
      isActive: true,
      isDefault: false,
      isPickupLocation: true,
      deliveryRadiusMiles: 25,
      deliveryFee: 500,
      coordinates: { lat: 39.7392, lng: -104.9903 },
    });
    expect(parsed.id).toEqual(expect.any(String));
    expect(parsed.createdAt).toBeInstanceOf(Date);
  });

  it('rejects invalid location types and coordinates', () => {
    expect(() => parseInventoryLocation({ name: 'Bad', type: 'garage' })).toThrow('type is invalid');
    expect(() => parseInventoryLocation({
      name: 'Bad',
      type: 'warehouse',
      coordinates: { lat: 120, lng: 0 },
    })).toThrow('coordinates.lat');
  });

  it('rejects empty updates', () => {
    expect(() => parseInventoryLocationUpdate({})).toThrow('No location fields provided');
  });
});
