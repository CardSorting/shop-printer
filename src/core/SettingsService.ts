/**
 * [LAYER: CORE]
 * Manages store-wide configuration and setup progress.
 */
import type { ISettingsRepository, IProductRepository, IDiscountRepository } from '@domain/repositories';
import type { JsonValue, NavigationMenu } from '@domain/models';
import type { ConciergeSettings } from '@domain/concierge/settings';
import { DEFAULT_CONCIERGE_SETTINGS } from '@domain/concierge/settings';
import { AuditService } from './AuditService';
import { DomainError } from '@domain/errors';

export interface SetupGuideProgress {
  hasProducts: boolean;
  hasStoreName: boolean;
  hasPaymentConfigured: boolean;
  hasShippingRates: boolean;
  hasCustomDomain: boolean;
  completedCount: number;
  totalCount: number;
}

export class SettingsService {
  constructor(
    private settingsRepo: ISettingsRepository,
    private productRepo: IProductRepository,
    private discountRepo: IDiscountRepository,
    private audit: AuditService
  ) {}

  async getSetupProgress(signal?: AbortSignal): Promise<SetupGuideProgress> {
    if (signal?.aborted) return {} as SetupGuideProgress;
    const [
      { products }, 
      storeName, 
      paymentConfig,
      shippingRates,
      customDomain
    ] = await Promise.all([
      this.productRepo.getAll({ limit: 1 }),
      this.settingsRepo.get<string>('store_name'),
      this.settingsRepo.get<boolean>('payment_configured'),
      this.settingsRepo.get<boolean>('shipping_configured'),
      this.settingsRepo.get<boolean>('domain_configured'),
    ]);
    
    const tasks = [
      { id: 'products', completed: products.length > 0 },
      { id: 'name', completed: !!storeName },
      { id: 'payments', completed: !!paymentConfig },
      { id: 'shipping', completed: !!shippingRates },
      { id: 'domain', completed: !!customDomain },
    ];


    const completedCount = tasks.filter(t => t.completed).length;

    return {
      hasProducts: tasks[0].completed,
      hasStoreName: tasks[1].completed,
      hasPaymentConfigured: tasks[2].completed,
      hasShippingRates: tasks[3].completed,
      hasCustomDomain: tasks[4].completed,
      completedCount,
      totalCount: tasks.length
    };
  }

  async getSettings(signal?: AbortSignal): Promise<Record<string, JsonValue>> {
    if (signal?.aborted) return {};
    return this.settingsRepo.getAll();
  }

  async getConciergeSettings(): Promise<ConciergeSettings> {
    const settings = await this.settingsRepo.get<ConciergeSettings>('concierge');
    return settings || DEFAULT_CONCIERGE_SETTINGS;
  }

  async updateConciergeSettings(settings: ConciergeSettings, actor: { id: string, email: string }): Promise<void> {
    await this.updateSetting('concierge', settings as unknown as JsonValue, actor);
  }

  async updateSetting(key: string, value: JsonValue, actor: { id: string, email: string }): Promise<void> {
    this.assertValidSettingKey(key);
    await this.settingsRepo.set(key, value);
    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'settings_updated',
      targetId: key,
      details: { value: this.redactSettingValueForAudit(key, value) }
    });
  }

  async getNavigationMenu(menuId: string): Promise<NavigationMenu | null> {
    const safeMenuId = this.normalizeMenuId(menuId);
    const raw = await this.settingsRepo.get<NavigationMenu>(`navigation_${safeMenuId}`);
    return raw;
  }

  async updateNavigationMenu(menuId: string, menu: NavigationMenu, actor: { id: string, email: string }): Promise<void> {
    const safeMenuId = this.normalizeMenuId(menuId);
    const safeMenu = this.validateNavigationMenu(safeMenuId, menu);
    await this.updateSetting(`navigation_${safeMenuId}`, safeMenu as unknown as JsonValue, actor);
  }

  /**
   * Operations tool: Create a discount draft for store operator review.
   */
  async createDiscountDraft(discount: any): Promise<void> {
    await this.discountRepo.create(discount);
  }

  private assertValidSettingKey(key: string): void {
    if (!/^[a-zA-Z0-9_.:-]{1,120}$/.test(key)) {
      throw new DomainError('Invalid setting key');
    }
  }

  private normalizeMenuId(menuId: string): string {
    const value = menuId.trim();
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(value)) {
      throw new DomainError('Invalid navigation menu id');
    }
    return value;
  }

  private validateNavigationMenu(menuId: string, menu: NavigationMenu): NavigationMenu {
    if (!menu || typeof menu !== 'object') throw new DomainError('Navigation menu must be an object');

    return {
      id: menuId,
      shopCategories: this.validateNavigationColumn(menu.shopCategories, 'shopCategories'),
      shopCollections: this.validateNavigationColumn(menu.shopCollections, 'shopCollections'),
      featuredPromotion: menu.featuredPromotion ? this.validateNavigationPromotion(menu.featuredPromotion) : undefined,
      otherLinks: this.validateNavigationLinks(menu.otherLinks, 'otherLinks', 12, 1),
    };
  }

  private validateNavigationColumn(column: any, field: string): NavigationMenu['shopCategories'] {
    if (!column || typeof column !== 'object') throw new DomainError(`${field} must be an object`);
    return {
      title: this.cleanText(column.title, `${field}.title`, 80),
      links: this.validateNavigationLinks(column.links, `${field}.links`, 24, 2),
    };
  }

  private validateNavigationLinks(links: any, field: string, maxItems: number, maxDepth: number): NavigationMenu['otherLinks'] {
    if (!Array.isArray(links)) throw new DomainError(`${field} must be an array`);
    if (links.length > maxItems) throw new DomainError(`${field} cannot contain more than ${maxItems} links`);

    return links.map((link, index) => {
      if (!link || typeof link !== 'object') throw new DomainError(`${field}[${index}] must be an object`);
      return {
        label: this.cleanText(link.label, `${field}[${index}].label`, 80),
        href: this.cleanHref(link.href, `${field}[${index}].href`),
        icon: link.icon === undefined ? undefined : this.cleanText(link.icon, `${field}[${index}].icon`, 40),
        isExternal: Boolean(link.isExternal),
        children: maxDepth > 0 && link.children !== undefined
          ? this.validateNavigationLinks(link.children, `${field}[${index}].children`, 12, maxDepth - 1)
          : undefined,
      };
    });
  }

  private validateNavigationPromotion(promotion: any): NavigationMenu['featuredPromotion'] {
    if (!promotion || typeof promotion !== 'object') throw new DomainError('featuredPromotion must be an object');
    return {
      imageUrl: this.cleanHref(promotion.imageUrl, 'featuredPromotion.imageUrl'),
      title: this.cleanText(promotion.title, 'featuredPromotion.title', 100),
      subtitle: promotion.subtitle === undefined ? undefined : this.cleanText(promotion.subtitle, 'featuredPromotion.subtitle', 120),
      linkText: this.cleanText(promotion.linkText, 'featuredPromotion.linkText', 60),
      linkHref: this.cleanHref(promotion.linkHref, 'featuredPromotion.linkHref'),
    };
  }

  private cleanText(value: unknown, field: string, maxLength: number): string {
    if (typeof value !== 'string') throw new DomainError(`${field} must be a string`);
    const trimmed = value.trim();
    if (!trimmed) throw new DomainError(`${field} must not be empty`);
    if (trimmed.length > maxLength) throw new DomainError(`${field} must be ${maxLength} characters or fewer`);
    return trimmed;
  }

  private cleanHref(value: unknown, field: string): string {
    const href = this.cleanText(value, field, 2048);
    if (href.startsWith('/') && !href.startsWith('//')) return href;

    try {
      const url = new URL(href);
      if (url.protocol === 'https:' || url.protocol === 'mailto:' || url.protocol === 'tel:') return href;
    } catch {
      throw new DomainError(`${field} must be a valid internal path or HTTPS URL`);
    }

    throw new DomainError(`${field} must use HTTPS, mailto, tel, or an internal path`);
  }

  private redactSettingValueForAudit(key: string, value: JsonValue): JsonValue {
    if (/(secret|token|password|credential|api[-_]?key)/i.test(key)) return '[REDACTED]';
    return value;
  }
}
