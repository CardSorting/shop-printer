/**
 * [LAYER: CORE]
 * Service for managing Collections
 */
import type { Collection } from '@domain/models';
import type { ICollectionRepository } from '@domain/repositories';
import { DomainError } from '@domain/errors';
import { AuditService } from './AuditService';
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from '@domain/seo/constants';

export class CollectionService {
  constructor(
    private collectionRepo: ICollectionRepository,
    private auditService: AuditService
  ) {}

  async list(options?: { status?: Collection['status']; limit?: number }): Promise<Collection[]> {
    return await this.collectionRepo.getAll(options);
  }

  async get(id: string): Promise<Collection | null> {
    this.assertId(id);
    return await this.collectionRepo.getById(id);
  }

  async getByHandle(handle: string): Promise<Collection | null> {
    return await this.collectionRepo.getByHandle(handle);
  }

  async create(data: Partial<Collection>, actor: { id: string; email: string }): Promise<Collection> {
    this.assertCollectionInput(data, false);
    
    const handle = data.handle || this.slugify(data.name!);
    
    const existing = await this.collectionRepo.getByHandle(handle);
    if (existing) throw new DomainError(`Collection with handle "${handle}" already exists`);

    const collection: Collection = {
      id: crypto.randomUUID(),
      name: data.name!,
      handle,
      description: data.description,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      imageUrl: data.imageUrl,
      productCount: 0,
      status: data.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.collectionRepo.save(collection);
    
    await this.auditService.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'collection.created',
      targetId: saved.id,
      details: { name: saved.name, handle: saved.handle }
    });

    return saved;
  }

  async update(id: string, updates: Partial<Collection>, actor: { id: string; email: string }): Promise<Collection> {
    this.assertId(id);
    this.assertCollectionInput(updates, true);
    const existing = await this.collectionRepo.getById(id);
    if (!existing) throw new DomainError('Collection not found');

    const nextHandle = updates.handle || (updates.name ? this.slugify(updates.name) : existing.handle);
    if (nextHandle !== existing.handle) {
      const duplicate = await this.collectionRepo.getByHandle(nextHandle);
      if (duplicate && duplicate.id !== id) throw new DomainError(`Collection with handle "${nextHandle}" already exists`);
    }

    const updated: Collection = {
      ...existing,
      ...updates,
      id,
      handle: nextHandle,
      productCount: existing.productCount,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    const saved = await this.collectionRepo.save(updated);

    await this.auditService.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'collection.updated',
      targetId: id,
      details: updates
    });

    return saved;
  }

  async delete(id: string, actor: { id: string; email: string }): Promise<void> {
    this.assertId(id);
    const existing = await this.collectionRepo.getById(id);
    if (!existing) throw new DomainError('Collection not found');

    await this.collectionRepo.delete(id);

    await this.auditService.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'collection.deleted',
      targetId: id,
      details: { name: existing.name }
    });
  }

  private assertCollectionInput(data: Partial<Collection>, partial: boolean): void {
    if (!partial || data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) throw new DomainError('Collection name is required');
      if (data.name.trim().length > 120) throw new DomainError('Collection name must be 120 characters or fewer.');
      data.name = data.name.trim();
    }
    if (data.handle !== undefined) data.handle = this.assertSlug(data.handle, 'handle');
    if (data.description !== undefined && data.description !== null && (typeof data.description !== 'string' || data.description.length > 2000)) {
      throw new DomainError('Collection description must be 2000 characters or fewer.');
    }
    if (data.seoTitle !== undefined && data.seoTitle !== null) {
      if (typeof data.seoTitle !== 'string' || data.seoTitle.length > SEO_TITLE_MAX + 10) {
        throw new DomainError(`SEO title must be ${SEO_TITLE_MAX} characters or fewer.`);
      }
    }
    if (data.seoDescription !== undefined && data.seoDescription !== null) {
      if (typeof data.seoDescription !== 'string' || data.seoDescription.length > SEO_DESCRIPTION_MAX + 20) {
        throw new DomainError(`SEO description must be ${SEO_DESCRIPTION_MAX} characters or fewer.`);
      }
    }
    if (data.imageUrl !== undefined && data.imageUrl !== null) this.assertUrl(data.imageUrl, 'imageUrl');
    if (data.status !== undefined && !['active', 'archived', 'draft'].includes(data.status)) throw new DomainError('Collection status is invalid.');
  }

  private assertId(id: string): void {
    if (!id || typeof id !== 'string') throw new DomainError('Collection id is required.');
  }

  private slugify(value: string): string {
    return this.assertSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), 'handle');
  }

  private assertSlug(value: unknown, field: string): string {
    if (typeof value !== 'string') throw new DomainError(`${field} must be a string.`);
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new DomainError(`${field} must contain letters or numbers.`);
    return slug;
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
