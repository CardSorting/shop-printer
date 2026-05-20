import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShippingService } from './ShippingService';

describe('ShippingService', () => {
  let repo: any;
  let audit: any;
  let service: ShippingService;
  const actor = { id: 'admin', email: 'admin@example.com' };

  beforeEach(() => {
    repo = {
      getAllClasses: vi.fn(),
      getClassById: vi.fn(),
      saveClass: vi.fn(async (value) => value),
      deleteClass: vi.fn(),
      getAllZones: vi.fn(),
      getZoneById: vi.fn(),
      saveZone: vi.fn(async (value) => value),
      deleteZone: vi.fn(),
      getRatesByZone: vi.fn(),
      getRatesByClass: vi.fn(),
      getAllRates: vi.fn(),
      saveRate: vi.fn(async (value) => value),
      deleteRate: vi.fn(),
    };
    audit = { record: vi.fn() };
    service = new ShippingService(repo, audit);
  });

  it('blocks deleting a shipping class referenced by a rate', async () => {
    repo.getRatesByClass.mockResolvedValue([{ id: 'rate-1' }]);

    await expect(service.deleteClass('class-1', actor)).rejects.toThrow('rates reference it');
    expect(repo.deleteClass).not.toHaveBeenCalled();
  });

  it('blocks deleting a shipping zone referenced by a rate', async () => {
    repo.getRatesByZone.mockResolvedValue([{ id: 'rate-1' }]);

    await expect(service.deleteZone('zone-1', actor)).rejects.toThrow('rates reference it');
    expect(repo.deleteZone).not.toHaveBeenCalled();
  });

  it('blocks saving a rate for missing shipping configuration', async () => {
    repo.getZoneById.mockResolvedValue(null);
    repo.getClassById.mockResolvedValue({ id: 'class-1' });
    repo.getAllRates.mockResolvedValue([]);

    await expect(service.saveRate({
      shippingZoneId: 'zone-missing',
      shippingClassId: 'class-1',
      name: 'Standard',
      type: 'flat',
      amount: 500,
    }, actor)).rejects.toThrow('Shipping zone does not exist');
    expect(repo.saveRate).not.toHaveBeenCalled();
  });
});
