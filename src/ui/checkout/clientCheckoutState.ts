'use client';

export const CLIENT_CHECKOUT_SESSION_VERSION = 1;

export type ClientCheckoutPhase = 'awaiting_payment' | 'payment_submitted';

export type CheckoutSessionStart = {
  clientSecret: string;
  paymentIntentId: string;
  orderId: string;
  amount: number;
  paymentStatus: string;
  expiresAt?: string;
  resumed?: boolean;
};

export type ClientCheckoutSession = CheckoutSessionStart & {
  version: typeof CLIENT_CHECKOUT_SESSION_VERSION;
  ownerUserId: string;
  attemptKey: string;
  createdAt: string;
  phase: ClientCheckoutPhase;
  requiresShipping: boolean;
};

const ATTEMPT_KEY = 'checkout:attemptKey';
const ACTIVE_SESSION_KEY = 'checkout:activeSession';
const SUBMITTED_PAYMENT_STATUSES = new Set(['processing', 'succeeded']);
const PAYMENT_RETRY_STATUSES = new Set([
  'requires_action',
  'requires_confirmation',
  'requires_payment_method',
]);
const CHECKOUT_RESTART_STATUSES = new Set(['canceled']);

function canUseSessionStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.sessionStorage.getItem('__checkout_storage_probe__');
    return true;
  } catch {
    return false;
  }
}

function createAttemptKey(): string {
  return `checkout-ui:${crypto.randomUUID()}`;
}

function sessionPhaseForStatus(status: string): ClientCheckoutPhase {
  return SUBMITTED_PAYMENT_STATUSES.has(status) ? 'payment_submitted' : 'awaiting_payment';
}

export function createClientCheckoutSession(
  start: CheckoutSessionStart,
  context: {
    ownerUserId: string;
    attemptKey: string;
    requiresShipping: boolean;
    now?: Date;
  },
): ClientCheckoutSession {
  return {
    ...start,
    version: CLIENT_CHECKOUT_SESSION_VERSION,
    ownerUserId: context.ownerUserId,
    attemptKey: context.attemptKey,
    createdAt: (context.now ?? new Date()).toISOString(),
    phase: sessionPhaseForStatus(start.paymentStatus),
    requiresShipping: context.requiresShipping,
  };
}

export function markCheckoutPaymentSubmitted(
  session: ClientCheckoutSession,
  paymentStatus = 'processing',
): ClientCheckoutSession {
  return { ...session, phase: 'payment_submitted', paymentStatus };
}

export function markCheckoutPaymentRequired(
  session: ClientCheckoutSession,
  paymentStatus = 'requires_payment_method',
): ClientCheckoutSession {
  return { ...session, phase: 'awaiting_payment', paymentStatus };
}

export function checkoutSessionNeedsPayment(session: ClientCheckoutSession): boolean {
  return session.phase === 'awaiting_payment';
}

export function checkoutStatusNeedsPayment(status: string | undefined): boolean {
  return status ? PAYMENT_RETRY_STATUSES.has(status) : false;
}

export function checkoutStatusRequiresRestart(status: string | undefined): boolean {
  return status ? CHECKOUT_RESTART_STATUSES.has(status) : false;
}

export function getOrCreateCheckoutAttemptKey(): string {
  if (!canUseSessionStorage()) return createAttemptKey();
  try {
    const existing = window.sessionStorage.getItem(ATTEMPT_KEY)?.trim();
    if (existing) return existing;

    const created = createAttemptKey();
    window.sessionStorage.setItem(ATTEMPT_KEY, created);
    return created;
  } catch {
    return createAttemptKey();
  }
}

export function saveActiveCheckoutSession(session: ClientCheckoutSession): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(ATTEMPT_KEY, session.attemptKey);
    window.sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Checkout remains usable in-memory when browser storage is unavailable.
  }
}

function isClientCheckoutSession(value: unknown): value is ClientCheckoutSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const session = value as Partial<ClientCheckoutSession>;
  return session.version === CLIENT_CHECKOUT_SESSION_VERSION
    && typeof session.ownerUserId === 'string'
    && Boolean(session.ownerUserId.trim())
    && typeof session.attemptKey === 'string'
    && Boolean(session.attemptKey.trim())
    && typeof session.clientSecret === 'string'
    && Boolean(session.clientSecret.trim())
    && typeof session.paymentIntentId === 'string'
    && Boolean(session.paymentIntentId.trim())
    && typeof session.orderId === 'string'
    && Boolean(session.orderId.trim())
    && typeof session.amount === 'number'
    && Number.isSafeInteger(session.amount)
    && session.amount >= 0
    && typeof session.paymentStatus === 'string'
    && typeof session.createdAt === 'string'
    && !Number.isNaN(Date.parse(session.createdAt))
    && (session.expiresAt === undefined || (typeof session.expiresAt === 'string' && !Number.isNaN(Date.parse(session.expiresAt))))
    && (session.phase === 'awaiting_payment' || session.phase === 'payment_submitted')
    && typeof session.requiresShipping === 'boolean';
}

export function readActiveCheckoutSession(ownerUserId?: string): ClientCheckoutSession | null {
  if (!canUseSessionStorage()) return null;
  const raw = window.sessionStorage.getItem(ACTIVE_SESSION_KEY);
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (!isClientCheckoutSession(value)) {
      throw new Error('Invalid active checkout session');
    }
    if (ownerUserId && value.ownerUserId !== ownerUserId) {
      clearActiveCheckoutSession();
      return null;
    }

    const storedAttempt = window.sessionStorage.getItem(ATTEMPT_KEY);
    if (storedAttempt && storedAttempt !== value.attemptKey) {
      throw new Error('Checkout attempt does not match active session');
    }
    window.sessionStorage.setItem(ATTEMPT_KEY, value.attemptKey);
    return value;
  } catch {
    clearActiveCheckoutSession();
    return null;
  }
}

export function clearActiveCheckoutSession(): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    window.sessionStorage.removeItem(ATTEMPT_KEY);
  } catch {
    // Nothing else can be cleared when browser storage is unavailable.
  }
}
