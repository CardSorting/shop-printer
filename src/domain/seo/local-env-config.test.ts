import { describe, expect, it } from 'vitest';
import { LOCAL_ENV_FIELDS, localEnvHintForAudit, buildLocalEnvSnippet, buildProductionEnvTemplate } from './local-env-config';

describe('domain/seo/local-env-config', () => {
  it('maps audit ids to env keys', () => {
    expect(localEnvHintForAudit('street')?.envKey).toBe('NEXT_PUBLIC_BUSINESS_STREET');
    expect(localEnvHintForAudit('missing')).toBeUndefined();
  });

  it('includes core local business fields', () => {
    const keys = LOCAL_ENV_FIELDS.map((f) => f.auditId);
    expect(keys).toContain('street');
    expect(keys).toContain('hours');
    expect(keys).toContain('site-url');
  });

  it('builds env snippet for incomplete audit items', () => {
    const snippet = buildLocalEnvSnippet(['street', 'phone']);
    expect(snippet).toContain('NEXT_PUBLIC_BUSINESS_STREET');
    expect(snippet).toContain('NEXT_PUBLIC_BUSINESS_PHONE');
    expect(buildLocalEnvSnippet([])).toContain('# WoodBine local SEO');
  });

  it('builds full production template with WoodBine defaults', () => {
    const template = buildProductionEnvTemplate();
    expect(template).toContain('NEXT_PUBLIC_SITE_URL=https://woodbine.com');
    expect(template).toContain('NEXT_PUBLIC_BUSINESS_STREET=');
    expect(template).toContain('NEXT_PUBLIC_BUSINESS_LAT=');
  });
});
