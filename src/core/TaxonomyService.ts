/**
 * [LAYER: CORE]
 * 
 * Taxonomy Service - Manages Product Categories and Types
 */
import type { ProductCategory, ProductType } from '@domain/models';
import type { ITaxonomyRepository } from '@domain/repositories';
import type { AuditService } from './AuditService';
import { DomainError } from '@domain/errors';

export class TaxonomyService {
  constructor(
    private repository: ITaxonomyRepository,
    private auditService: AuditService
  ) {}

  // ─────────────────────────────────────────────
  // Categories
  // ─────────────────────────────────────────────

  async getAllCategories(): Promise<ProductCategory[]> {
    return this.repository.getAllCategories();
  }

  async getCategoryById(id: string): Promise<ProductCategory | null> {
    return this.repository.getCategoryById(id);
  }

  async getCategoryBySlug(slug: string): Promise<ProductCategory | null> {
    return this.repository.getCategoryBySlug(slug);
  }

  async saveCategory(category: Partial<ProductCategory>, actor: { id: string; email: string }): Promise<ProductCategory> {
    this.assertCategoryInput(category);
    const isNew = !category.id;
    const id = category.id || crypto.randomUUID();
    const slug = category.slug || this.slugify(category.name!);
    const existingSlug = await this.repository.getCategoryBySlug(slug);
    if (existingSlug && existingSlug.id !== id) throw new DomainError(`Category with slug "${slug}" already exists`);
    
    const data: ProductCategory = {
      id,
      name: category.name!.trim(),
      slug,
      description: category.description ?? null,
      createdAt: category.createdAt || new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.repository.saveCategory(data);

    await this.auditService.record({
      userId: actor.id,
      userEmail: actor.email,
      action: isNew ? 'category_created' : 'category_updated',
      targetId: saved.id,
      details: { name: saved.name, slug: saved.slug },
    });

    return saved;
  }

  async deleteCategory(id: string, actor: { id: string; email: string }): Promise<void> {
    this.assertId(id, 'Category');
    const category = await this.repository.getCategoryById(id);
    if (!category) throw new DomainError('Category not found');

    await this.repository.deleteCategory(id);

    await this.auditService.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'category_deleted',
      targetId: id,
      details: { name: category.name },
    });
  }

  // ─────────────────────────────────────────────
  // Types
  // ─────────────────────────────────────────────

  async getAllTypes(): Promise<ProductType[]> {
    return this.repository.getAllTypes();
  }

  async getTypeById(id: string): Promise<ProductType | null> {
    return this.repository.getTypeById(id);
  }

  async saveType(type: Partial<ProductType>, actor: { id: string; email: string }): Promise<ProductType> {
    this.assertTypeInput(type);
    const isNew = !type.id;
    const id = type.id || crypto.randomUUID();
    const duplicate = (await this.repository.getAllTypes()).find((existing) => existing.id !== id && existing.name.toLowerCase() === type.name!.trim().toLowerCase());
    if (duplicate) throw new DomainError(`Product type "${type.name}" already exists`);

    const data: ProductType = {
      id,
      name: type.name!.trim(),
      createdAt: type.createdAt || new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.repository.saveType(data);

    await this.auditService.record({
      userId: actor.id,
      userEmail: actor.email,
      action: isNew ? 'product_type_created' : 'product_type_updated',
      targetId: saved.id,
      details: { name: saved.name },
    });

    return saved;
  }

  async deleteType(id: string, actor: { id: string; email: string }): Promise<void> {
    this.assertId(id, 'Product type');
    const type = await this.repository.getTypeById(id);
    if (!type) throw new DomainError('Product type not found');

    await this.repository.deleteType(id);

    await this.auditService.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'product_type_deleted',
      targetId: id,
      details: { name: type.name },
    });
  }

  private assertCategoryInput(category: Partial<ProductCategory>): void {
    if (category.id !== undefined) this.assertId(category.id, 'Category');
    if (typeof category.name !== 'string' || !category.name.trim()) throw new DomainError('Category name is required.');
    if (category.name.trim().length > 120) throw new DomainError('Category name must be 120 characters or fewer.');
    if (category.slug !== undefined) category.slug = this.assertSlug(category.slug, 'slug');
    if (category.description !== undefined && category.description !== null && (typeof category.description !== 'string' || category.description.length > 2000)) {
      throw new DomainError('Category description must be 2000 characters or fewer.');
    }
  }

  private assertTypeInput(type: Partial<ProductType>): void {
    if (type.id !== undefined) this.assertId(type.id, 'Product type');
    if (typeof type.name !== 'string' || !type.name.trim()) throw new DomainError('Product type name is required.');
    if (type.name.trim().length > 120) throw new DomainError('Product type name must be 120 characters or fewer.');
  }

  private assertId(id: string, label: string): void {
    if (typeof id !== 'string' || !id.trim()) throw new DomainError(`${label} id is required.`);
  }

  private slugify(value: string): string {
    return this.assertSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), 'slug');
  }

  private assertSlug(value: unknown, field: string): string {
    if (typeof value !== 'string') throw new DomainError(`${field} must be a string.`);
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new DomainError(`${field} must contain letters or numbers.`);
    return slug;
  }
}
