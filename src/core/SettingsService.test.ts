import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsService } from './SettingsService';

describe('SettingsService hardening', () => {
  let settingsRepo: any;
  let service: SettingsService;
  let audit: any;

  beforeEach(() => {
    settingsRepo = {
      get: vi.fn(),
      set: vi.fn(),
      getAll: vi.fn(),
    };
    audit = {
      record: vi.fn(),
    };
    service = new SettingsService(settingsRepo, {} as any, {} as any, audit);
  });

  it('rejects unsafe navigation hrefs before persisting', async () => {
    await expect(service.updateNavigationMenu('main-nav', {
      id: 'main-nav',
      shopCategories: {
        title: 'Categories',
        links: [{ label: 'Bad', href: 'javascript:alert(1)' }],
      },
      shopCollections: {
        title: 'Collections',
        links: [{ label: 'Safe', href: '/collections/safe' }],
      },
      otherLinks: [],
    }, { id: 'admin', email: 'admin@example.com' })).rejects.toThrow(/must use HTTPS/);

    expect(settingsRepo.set).not.toHaveBeenCalled();
  });

  it('redacts sensitive setting values from audit details', async () => {
    await service.updateSetting('stripe_secret_key', 'sk_live_secret', { id: 'admin', email: 'admin@example.com' });

    expect(settingsRepo.set).toHaveBeenCalledWith('stripe_secret_key', 'sk_live_secret');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      details: { value: '[REDACTED]' },
    }));
  });
});
