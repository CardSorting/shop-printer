import type { InventoryLocation } from '@domain/models';
import type { IInventoryLocationRepository } from '@domain/repositories';
import { DomainError } from '@domain/errors';

export type LocationAdminActor = { id: string; email: string };

export class LocationAdminService {
  constructor(private locationRepo: IInventoryLocationRepository) {}

  listLocations(): Promise<InventoryLocation[]> {
    return this.locationRepo.findAll();
  }

  getLocation(id: string): Promise<InventoryLocation | null> {
    return this.locationRepo.findById(id);
  }

  createLocation(location: InventoryLocation): Promise<InventoryLocation> {
    return this.locationRepo.save(location);
  }

  async updateLocation(
    id: string,
    patch: Partial<Omit<InventoryLocation, 'id' | 'createdAt'>>,
  ): Promise<InventoryLocation> {
    const existing = await this.locationRepo.findById(id);
    if (!existing) throw new DomainError('Location not found.');
    if (existing.isDefault && patch.isActive === false) {
      throw new DomainError('Default inventory location cannot be deactivated.');
    }
    return this.locationRepo.update(id, patch);
  }

  async archiveLocation(id: string): Promise<InventoryLocation> {
    const existing = await this.locationRepo.findById(id);
    if (!existing) throw new DomainError('Location not found.');
    if (existing.isDefault) {
      throw new DomainError('Default inventory location cannot be archived.');
    }
    return this.locationRepo.update(id, { isActive: false });
  }
}
