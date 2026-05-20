import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionService } from './CollectionService';
import { SupplierService } from './SupplierService';
import { TaxonomyService } from './TaxonomyService';

describe('catalog admin service hardening', () => {
  const actor = { id: 'admin-1', email: 'admin@example.com' };
  const audit = { record: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects duplicate collection handles on update', async () => {
    const repo = {
      getAll: vi.fn(),
      getById: vi.fn().mockResolvedValue({
        id: 'c1',
        name: 'Cards',
        handle: 'cards',
        productCount: 7,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      getByHandle: vi.fn().mockResolvedValue({ id: 'c2', handle: 'rare-cards' }),
      save: vi.fn(),
      delete: vi.fn(),
      updateProductCount: vi.fn(),
    };
    const service = new CollectionService(repo, audit);

    await expect(service.update('c1', { handle: 'rare-cards', productCount: 0 }, actor)).rejects.toThrow('already exists');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('filters supplier queries in service instead of returning unrelated records', async () => {
    const repo = {
      getAll: vi.fn().mockResolvedValue([
        { id: 's1', name: 'Acme Cards', email: 'orders@acme.test', createdAt: new Date(), updatedAt: new Date() },
        { id: 's2', name: 'Other Distributor', email: 'ops@other.test', createdAt: new Date(), updatedAt: new Date() },
      ]),
      getById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    };
    const service = new SupplierService(repo, audit);

    const result = await service.list({ query: 'acme', limit: 10 });

    expect(result.map((supplier) => supplier.id)).toEqual(['s1']);
  });

  it('rejects blank taxonomy categories and duplicate type names', async () => {
    const repo = {
      getAllCategories: vi.fn(),
      getCategoryById: vi.fn(),
      getCategoryBySlug: vi.fn(),
      saveCategory: vi.fn(),
      deleteCategory: vi.fn(),
      getAllTypes: vi.fn().mockResolvedValue([{ id: 't2', name: 'Print' }]),
      getTypeById: vi.fn(),
      saveType: vi.fn(),
      deleteType: vi.fn(),
    };
    const service = new TaxonomyService(repo, audit);

    await expect(service.saveCategory({ name: '' }, actor)).rejects.toThrow('Category name is required');
    await expect(service.saveType({ id: 't1', name: 'print' }, actor)).rejects.toThrow('already exists');
    expect(repo.saveCategory).not.toHaveBeenCalled();
    expect(repo.saveType).not.toHaveBeenCalled();
  });
});
