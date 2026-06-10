import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ProductionNotReadyError,
  assertProductionReadiness,
  validateProductionEnv,
} from '@infrastructure/server/productionEnv';
import {
  evaluateStripeHealth,
  smokeTestCommerceEventStore,
} from '@infrastructure/server/protocolHealth';
import { InMemoryCommerceEventStore } from './helpers/inMemoryCommerceEventStore';

const ENV_SNAPSHOT = { ...process.env };

afterEach(() => {
  process.env = { ...ENV_SNAPSHOT };
  vi.unstubAllEnvs();
});

function setProductionEnv(overrides: Record<string, string | undefined> = {}) {
  vi.stubEnv('NODE_ENV', 'production');
  const base: Record<string, string> = {
    SESSION_SECRET: 'x'.repeat(40),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'prod-project',
    NEXT_PUBLIC_SITE_URL: 'https://store.example.com',
    STRIPE_SECRET_KEY: 'sk_live_test_key',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
    SYSTEM_JOB_TOKEN: 'y'.repeat(40),
    FIREBASE_SERVICE_ACCOUNT_JSON: '{"type":"service_account","project_id":"prod-project"}',
    ALLOW_PRODUCTION_SEEDING: 'false',
  };
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe('Production readiness (proof ladder)', () => {
  it('[env] missing required env fails production readiness', () => {
    setProductionEnv({ STRIPE_WEBHOOK_SECRET: undefined });
    const validation = validateProductionEnv({ productionOnly: true });
    expect(validation.ok).toBe(false);
    expect(validation.issues.some((issue) => issue.variable === 'STRIPE_WEBHOOK_SECRET')).toBe(true);
    expect(() => assertProductionReadiness()).toThrow(ProductionNotReadyError);
  });

  it('[env] dev mode does not assert production readiness', () => {
    vi.stubEnv('NODE_ENV', 'development');
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(() => assertProductionReadiness()).not.toThrow();
  });

  it('[stripe] protocol health returns degraded when Stripe missing', () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const check = evaluateStripeHealth();
    expect(check.ok).toBe(false);
    expect(check.status).toBe('degraded');
  });

  it('[commerce events] smoke test confirms write/read', async () => {
    const store = new InMemoryCommerceEventStore();
    const check = await smokeTestCommerceEventStore(store);
    expect(check.ok).toBe(true);
    expect(check.status).toBe('ok');
    expect(store.events.some((event) => event.type === 'health.probe')).toBe(true);
  });

  it('[health route] never exposes secrets in source contract', () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/system/health/protocols/route.ts'),
      'utf8',
    );
    const protocolHealth = fs.readFileSync(
      path.join(process.cwd(), 'src/infrastructure/server/protocolHealth.ts'),
      'utf8',
    );
    expect(route).not.toMatch(/process\.env\.(STRIPE|SESSION|SYSTEM_JOB|FIREBASE)/);
    expect(route).not.toMatch(/JSON\.stringify\(process\.env/);
    expect(protocolHealth).not.toMatch(/STRIPE_SECRET_KEY.*message/);
    expect(route).toMatch(/issue\.variable/);
  });

  it('[runbook] documents checkout refund inventory support failures', () => {
    const runbook = fs.readFileSync(
      path.join(process.cwd(), 'docs/commerce-incident-runbook.md'),
      'utf8',
    );
    expect(runbook).toMatch(/checkout/i);
    expect(runbook).toMatch(/refund/i);
    expect(runbook).toMatch(/inventory/i);
    expect(runbook).toMatch(/support/i);
    expect(runbook).toMatch(/protocol health|health\/protocols/i);
  });

  it('[README] links production readiness doc', () => {
    const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
    expect(readme).toMatch(/production-readiness\.md/);
    expect(readme).toMatch(/commerce-incident-runbook\.md/);
  });
});
