import * as crypto from 'node:crypto';
import type { ICommerceEventStore } from '@core/commerce/commerceEventBus';
import type { CommerceEventEnvelope } from '@core/commerce/commerceEventTypes';
import { adminDb, withAdminFirestoreRetry } from '@infrastructure/firebase/admin';
import { logger } from '@utils/logger';
import { validateProductionEnv } from './productionEnv';

export type HealthCheck = {
  ok: boolean;
  status: 'ok' | 'degraded' | 'failed';
  message?: string;
  latencyMs?: number;
};

export type ProtocolHealthReport = {
  ok: boolean;
  checks: {
    checkout: HealthCheck;
    refunds: HealthCheck;
    inventory: HealthCheck;
    admin: HealthCheck;
    crm: HealthCheck;
    support: HealthCheck;
    commerceEvents: HealthCheck;
    stripe: HealthCheck;
    firestore: HealthCheck;
  };
  env: {
    ok: boolean;
    issueCount: number;
  };
};

type ProtocolServices = {
  checkout?: unknown;
  refunds?: unknown;
  inventory?: unknown;
  admin?: unknown;
  crm?: unknown;
  support?: unknown;
  commerceEventStore?: ICommerceEventStore;
};

function envPresent(name: string): boolean {
  const value = process.env[name]?.trim();
  return Boolean(value && value !== 'undefined');
}

function timed<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
  const start = Date.now();
  return fn().then((result) => ({ result, latencyMs: Date.now() - start }));
}

export function evaluateStripeHealth(): HealthCheck {
  const hasSecret = envPresent('STRIPE_SECRET_KEY');
  const hasWebhook = envPresent('STRIPE_WEBHOOK_SECRET');
  const secretValid = !hasSecret || process.env.STRIPE_SECRET_KEY!.trim().startsWith('sk_');
  const webhookValid = !hasWebhook || process.env.STRIPE_WEBHOOK_SECRET!.trim().startsWith('whsec_');

  if (!hasSecret && !hasWebhook) {
    return { ok: false, status: 'degraded', message: 'Stripe keys not configured' };
  }
  if (!hasSecret || !hasWebhook) {
    return {
      ok: false,
      status: 'degraded',
      message: !hasSecret ? 'STRIPE_SECRET_KEY missing' : 'STRIPE_WEBHOOK_SECRET missing',
    };
  }
  if (!secretValid || !webhookValid) {
    return { ok: false, status: 'failed', message: 'Stripe env format invalid' };
  }
  return { ok: true, status: 'ok', message: 'Stripe configured' };
}

export function evaluateFirestoreCredentials(): HealthCheck {
  const hasServiceAccount = envPresent('FIREBASE_SERVICE_ACCOUNT_JSON');
  const hasProject = envPresent('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!hasProject) {
    return { ok: false, status: 'failed', message: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID missing' };
  }
  if (!hasServiceAccount && process.env.NODE_ENV === 'production') {
    return { ok: false, status: 'degraded', message: 'FIREBASE_SERVICE_ACCOUNT_JSON missing' };
  }
  return { ok: true, status: 'ok', message: 'Firebase credentials present' };
}

export async function probeFirestoreRead(): Promise<HealthCheck> {
  try {
    const { latencyMs } = await timed(() =>
      withAdminFirestoreRetry(
        () => adminDb.collection('commerce_events').limit(1).get(),
        { operationName: 'protocolHealth.firestoreRead', maxAttempts: 2 },
      ),
    );
    return { ok: true, status: 'ok', message: 'Firestore read succeeded', latencyMs };
  } catch (error) {
    logger.error('protocol.health.firestore_failed', { error });
    return {
      ok: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Firestore read failed',
    };
  }
}

export async function smokeTestCommerceEventStore(store: ICommerceEventStore): Promise<HealthCheck> {
  const probeId = `health-probe-${crypto.randomUUID()}`;
  const envelope: CommerceEventEnvelope = {
    id: probeId,
    type: 'health.probe',
    protocol: 'admin',
    actor: { id: 'system', type: 'system' },
    entity: { type: 'order', id: 'health-probe' },
    correlationId: 'health:probe',
    idempotencyKey: probeId,
    occurredAt: new Date().toISOString(),
    payload: { probe: true },
  };

  try {
    const { latencyMs } = await timed(async () => {
      await store.append(envelope);
      const found = await store.findByCorrelationId('health:probe', { limit: 5 });
      if (!found.some((event) => event.id === probeId)) {
        throw new Error('Commerce event probe read failed');
      }
    });
    return { ok: true, status: 'ok', message: 'Commerce event write/read succeeded', latencyMs };
  } catch (error) {
    logger.error('protocol.health.commerce_events_failed', { error });
    return {
      ok: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Commerce event smoke test failed',
    };
  }
}

function dependencyCheck(
  present: boolean,
  label: string,
  extra?: { ok: boolean; message?: string },
): HealthCheck {
  if (!present) {
    return { ok: false, status: 'failed', message: `${label} service not wired` };
  }
  if (extra && !extra.ok) {
    return { ok: false, status: 'degraded', message: extra.message ?? `${label} dependency degraded` };
  }
  return { ok: true, status: 'ok', message: `${label} ready` };
}

export async function runProtocolHealthChecks(services: ProtocolServices): Promise<ProtocolHealthReport> {
  const envValidation = validateProductionEnv();
  const stripe = evaluateStripeHealth();
  const firestoreCredentials = evaluateFirestoreCredentials();
  const firestore = await probeFirestoreRead();
  const commerceEvents = services.commerceEventStore
    ? await smokeTestCommerceEventStore(services.commerceEventStore)
    : { ok: false, status: 'failed' as const, message: 'Commerce event store not wired' };

  const checks = {
    checkout: dependencyCheck(Boolean(services.checkout), 'checkout', {
      ok: stripe.ok,
      message: stripe.ok ? undefined : 'Checkout requires Stripe',
    }),
    refunds: dependencyCheck(Boolean(services.refunds), 'refunds', {
      ok: stripe.ok,
      message: stripe.ok ? undefined : 'Refunds require Stripe',
    }),
    inventory: dependencyCheck(Boolean(services.inventory), 'inventory', {
      ok: firestore.ok,
      message: firestore.ok ? undefined : 'Inventory requires Firestore',
    }),
    admin: dependencyCheck(Boolean(services.admin), 'admin'),
    crm: dependencyCheck(Boolean(services.crm), 'crm', {
      ok: firestore.ok,
      message: firestore.ok ? undefined : 'CRM requires Firestore',
    }),
    support: dependencyCheck(Boolean(services.support), 'support', {
      ok: firestore.ok,
      message: firestore.ok ? undefined : 'Support requires Firestore',
    }),
    commerceEvents,
    stripe,
    firestore: firestoreCredentials.ok && firestore.ok
      ? firestore
      : {
          ok: false,
          status: firestore.ok ? 'degraded' as const : 'failed' as const,
          message: firestoreCredentials.ok ? firestore.message : firestoreCredentials.message,
          latencyMs: firestore.latencyMs,
        },
  };

  const ok = Object.values(checks).every((check) => check.ok) && envValidation.ok;

  logger.info('protocol.health.report', {
    ok,
    envOk: envValidation.ok,
    issueCount: envValidation.issues.length,
    degraded: Object.entries(checks)
      .filter(([, check]) => !check.ok)
      .map(([name]) => name),
  });

  return {
    ok,
    checks,
    env: {
      ok: envValidation.ok,
      issueCount: envValidation.issues.length,
    },
  };
}
