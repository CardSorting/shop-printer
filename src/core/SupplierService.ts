/**
 * [LAYER: CORE]
 * Service for managing Suppliers (Wholesalers)
 */
import type { Supplier } from '@domain/models';
import type { ISupplierRepository } from '@domain/repositories';
import { AuditService } from './AuditService';
import { DomainError } from '@domain/errors';

export class SupplierService {
  constructor(
    private supplierRepo: ISupplierRepository,
    private auditService: AuditService
  ) {}

  async list(options?: { query?: string; limit?: number; offset?: number }): Promise<Supplier[]> {
    const limit = this.normalizeLimit(options?.limit);
    const suppliers = await this.supplierRepo.getAll(options?.query ? { offset: options.offset } : { ...options, limit });
    const filtered = options?.query ? this.filterByQuery(suppliers, options.query) : suppliers;
    return filtered.slice(options?.offset ?? 0, (options?.offset ?? 0) + limit);
  }

  async get(id: string): Promise<Supplier | null> {
    this.assertId(id);
    return await this.supplierRepo.getById(id);
  }

  async create(data: Partial<Supplier>, actor: { id: string; email: string }): Promise<Supplier> {
    this.assertSupplierInput(data, false);
    
    const supplier: Supplier = {
      id: crypto.randomUUID(),
      name: data.name!,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      website: data.website,
      address: data.address,
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.supplierRepo.save(supplier);
    
    await this.auditService.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'supplier.created',
      targetId: saved.id,
      details: { name: saved.name }
    });

    return saved;
  }

  async update(id: string, updates: Partial<Supplier>, actor: { id: string; email: string }): Promise<Supplier> {
    this.assertId(id);
    this.assertSupplierInput(updates, true);
    const existing = await this.supplierRepo.getById(id);
    if (!existing) throw new DomainError('Supplier not found');

    const updated: Supplier = {
      ...existing,
      ...updates,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    const saved = await this.supplierRepo.save(updated);

    await this.auditService.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'supplier.updated',
      targetId: id,
      details: updates
    });

    return saved;
  }

  async delete(id: string, actor: { id: string; email: string }): Promise<void> {
    this.assertId(id);
    const existing = await this.supplierRepo.getById(id);
    if (!existing) throw new DomainError('Supplier not found');

    await this.supplierRepo.delete(id);

    await this.auditService.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'supplier.deleted',
      targetId: id,
      details: { name: existing.name }
    });
  }

  private filterByQuery(suppliers: Supplier[], query: string): Supplier[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return suppliers;
    return suppliers.filter((supplier) => [
      supplier.name,
      supplier.contactName,
      supplier.email,
      supplier.phone,
      supplier.website,
      supplier.notes,
    ].some((value) => value?.toLowerCase().includes(needle)));
  }

  private normalizeLimit(limit?: number): number {
    if (limit === undefined) return 50;
    if (!Number.isInteger(limit) || limit <= 0) throw new DomainError('limit must be a positive whole number.');
    return Math.min(limit, 100);
  }

  private assertSupplierInput(data: Partial<Supplier>, partial: boolean): void {
    if (!partial || data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) throw new DomainError('Supplier name is required');
      if (data.name.trim().length > 160) throw new DomainError('Supplier name must be 160 characters or fewer.');
      data.name = data.name.trim();
    }
    if (data.email !== undefined && data.email !== null) {
      if (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new DomainError('Supplier email must be valid.');
      data.email = data.email.toLowerCase();
    }
    if (data.website !== undefined && data.website !== null) this.assertUrl(data.website, 'website');
    if (data.address !== undefined && data.address !== null) {
      for (const field of ['street', 'city', 'state', 'zip', 'country'] as const) {
        if (typeof data.address[field] !== 'string' || !data.address[field].trim()) throw new DomainError(`Supplier address ${field} is required.`);
      }
    }
    if (data.notes !== undefined && data.notes !== null && (typeof data.notes !== 'string' || data.notes.length > 5000)) {
      throw new DomainError('Supplier notes must be 5000 characters or fewer.');
    }
  }

  private assertId(id: string): void {
    if (!id || typeof id !== 'string') throw new DomainError('Supplier id is required.');
  }

  private assertUrl(value: unknown, field: string): void {
    if (typeof value !== 'string') throw new DomainError(`${field} must be a string.`);
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new DomainError(`${field} must be a valid URL.`);
    }
    if (!['https:', 'http:'].includes(url.protocol)) throw new DomainError(`${field} must use http or https.`);
  }
}
