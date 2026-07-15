import type { Order } from '@domain/models';
import { checkoutStatusNeedsPayment, checkoutStatusRequiresRestart } from './clientCheckoutState';

export type CheckoutVerification = {
  success: boolean;
  orderId?: string;
  status?: string;
  message?: string;
};

export class CheckoutFinalizationError extends Error {
  constructor(
    message: string,
    readonly paymentStatus?: string,
    readonly retryable = true,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'CheckoutFinalizationError';
  }
}

const DEFAULT_VERIFICATION_DELAYS_MS = [0, 400, 800, 1_600, 3_200, 5_000] as const;

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isRetryableRequestError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { retryable?: unknown; status?: unknown };
  if (candidate.retryable === true) return true;
  return typeof candidate.status === 'number' && (candidate.status === 429 || candidate.status >= 500);
}

export async function finalizeClientCheckout(params: {
  paymentIntentId: string;
  expectedOrderId?: string;
  verify: (paymentIntentId: string) => Promise<CheckoutVerification>;
  loadOrder: (orderId: string) => Promise<Order>;
  delaysMs?: readonly number[];
  waitForDelay?: (delayMs: number) => Promise<void>;
}): Promise<Order> {
  const delays = params.delaysMs ?? DEFAULT_VERIFICATION_DELAYS_MS;
  const waitForDelay = params.waitForDelay ?? wait;
  let latestStatus: string | undefined;
  let lastRetryableError: unknown;

  for (const delayMs of delays) {
    if (delayMs > 0) await waitForDelay(delayMs);

    let verification: CheckoutVerification;
    try {
      verification = await params.verify(params.paymentIntentId);
      lastRetryableError = undefined;
    } catch (error) {
      if (!isRetryableRequestError(error)) throw error;
      lastRetryableError = error;
      continue;
    }

    latestStatus = verification.status;
    if (verification.success && verification.orderId) {
      if (params.expectedOrderId && verification.orderId !== params.expectedOrderId) {
        throw new CheckoutFinalizationError(
          'Payment verification returned a different order. Support has been notified; do not retry payment.',
          verification.status,
          false,
        );
      }
      try {
        return await params.loadOrder(verification.orderId);
      } catch (error) {
        if (!isRetryableRequestError(error)) throw error;
        lastRetryableError = error;
        continue;
      }
    }

    if (checkoutStatusNeedsPayment(verification.status)) {
      throw new CheckoutFinalizationError(
        verification.message ?? 'Payment was not completed. Please review your payment details.',
        verification.status,
        false,
      );
    }
    if (checkoutStatusRequiresRestart(verification.status)) {
      throw new CheckoutFinalizationError(
        verification.message ?? 'This checkout session was canceled. Return to checkout before trying another payment.',
        verification.status,
        false,
      );
    }
  }

  if (lastRetryableError && !latestStatus) {
    throw new CheckoutFinalizationError(
      'We could not reach payment verification. Your checkout is saved; check payment status again without resubmitting the card.',
      undefined,
      true,
      { cause: lastRetryableError },
    );
  }

  throw new CheckoutFinalizationError(
    latestStatus === 'processing'
      ? 'Your payment is still processing. Do not submit it again; check payment status in a moment.'
      : 'Payment was received but order confirmation is delayed. Do not submit it again; check payment status.',
    latestStatus,
    true,
  );
}
