import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CheckoutFlowService } from '@core/order/CheckoutFlowService';
import { InMemoryCheckoutEventLog } from './helpers/inMemoryCheckoutEventLog';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function collectTsSources(root: string): Array<{ file: string; source: string }> {
  const files: Array<{ file: string; source: string }> = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
      if (entry.name.endsWith('.test.ts')) continue;
      files.push({
        file: path.relative(process.cwd(), full),
        source: fs.readFileSync(full, 'utf8'),
      });
    }
  };
  walk(root);
  return files;
}

function makeWebhookFlow(confirmStripePayment = vi.fn().mockResolvedValue({ id: 'order-paid', status: 'processing' })) {
  const stripe = {
    constructEvent: vi.fn().mockReturnValue({
      id: 'evt_payment_proof',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_payment_proof', metadata: { orderId: 'order-paid' } } },
    }),
    tryProcessEvent: vi.fn()
      .mockResolvedValueOnce({ alreadyProcessed: false, claimToken: 'claim-1' })
      .mockResolvedValueOnce({ alreadyProcessed: true, claimToken: null }),
    getEventStatus: vi.fn().mockResolvedValue('completed'),
    getPaymentIntent: vi.fn(),
    markEventProcessed: vi.fn(),
    markEventFailed: vi.fn(),
  };
  const mutations = {
    runCheckoutReservation: vi.fn(),
    rollbackUnpaidCheckout: vi.fn(),
    confirmStripePayment,
  };
  const flow = new CheckoutFlowService(mutations as any, { getById: vi.fn() } as any, {
    stripe: stripe as any,
    eventLog: new InMemoryCheckoutEventLog(),
  });
  return { flow, stripe, confirmStripePayment };
}

describe('Payment capture proof (money authority)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('[ui] Stripe form confirms only the server-created PaymentIntent', () => {
    const form = read('src/ui/checkout/StripeCheckoutForm.tsx');
    const client = read('src/ui/checkout/stripeClient.ts');
    expect(form).toMatch(/confirmCardPayment/);
    expect(form).toMatch(/session\.clientSecret/);
    expect(form).not.toMatch(/createPaymentIntent/);
    expect(form).not.toMatch(/charges\.create/);
    expect(client).toMatch(/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/);
    expect(client).not.toMatch(/STRIPE_SECRET/);
    expect(client).not.toMatch(/sk_live/);
    expect(client).not.toMatch(/sk_test/);
  });

  it('[ui] checkout page finalizes through services.checkout API', () => {
    const page = read('src/ui/pages/CheckoutPage.tsx');
    const apiClient = read('src/ui/apiClientServices.ts');
    expect(page).toMatch(/services\.checkout\.start/);
    expect(page).toMatch(/services\.checkout\.finalize/);
    expect(page).toMatch(/gateCheckoutCommit/);
    expect(page).not.toMatch(/confirmCardPayment/);
    expect(apiClient).toMatch(/\/api\/checkout\/create-payment-intent/);
    expect(apiClient).toMatch(/\/api\/checkout\/verify/);
  });

  it('[routes] payment ingress delegates to services.checkout only', () => {
    const createIntent = read('src/app/api/checkout/create-payment-intent/route.ts');
    const orders = read('src/app/api/orders/route.ts');
    const verify = read('src/app/api/checkout/verify/route.ts');
    const webhook = read('src/app/api/webhooks/stripe/route.ts');

    expect(createIntent).toMatch(/services\.checkout\.createCheckoutSession/);
    expect(createIntent).toMatch(/requireIdempotencyKey/);
    expect(createIntent).not.toMatch(/confirmStripePayment/);
    expect(createIntent).not.toMatch(/createPaymentIntent\(/);

    expect(orders).toMatch(/export async function GET/);
    expect(orders).not.toMatch(/export async function POST/);

    expect(verify).toMatch(/services\.checkout\.recoverPendingOrder/);
    expect(verify).not.toMatch(/getPaymentIntent\(/);

    expect(webhook).toMatch(/services\.checkout\.handleCheckoutWebhook/);
    expect(webhook).not.toMatch(/confirmStripePayment/);
  });

  it('[core] PaymentIntent amount is derived from server order total', () => {
    const paymentIntentFlow = read('src/core/order/checkoutPaymentIntentFlow.ts');
    expect(paymentIntentFlow).toMatch(/amount: order\.total/);
    expect(paymentIntentFlow).toMatch(/existingPi\.amount !== order\.total/);
    expect(paymentIntentFlow).toMatch(/Existing payment intent amount does not match/);
  });

  it('[core] money finalization stays inside checkout mutation service', () => {
    const mutation = read('src/core/order/checkoutMutationService.ts');
    const webhookIngress = read('src/core/order/checkoutWebhookIngressFlow.ts');
    expect(mutation).toMatch(/confirmStripePayment/);
    expect(mutation).toMatch(/transitionPaymentState/);
    expect(webhookIngress).toMatch(/payment_intent\.succeeded/);
    expect(webhookIngress).toMatch(/payment_intent\.payment_failed/);
    expect(webhookIngress).toMatch(/confirmPaymentFromStripe/);
    expect(webhookIngress).toMatch(/stripe-signature/);
  });

  it('[chain] cart never touches Stripe or payment capture', () => {
    const cartApi = path.join(process.cwd(), 'src/app/api/cart');
    const cartUi = path.join(process.cwd(), 'src/ui/cart');
    for (const { file, source } of [...collectTsSources(cartApi), ...collectTsSources(cartUi)]) {
      expect(source, file).not.toMatch(/Stripe/);
      expect(source, file).not.toMatch(/paymentIntent/);
      expect(source, file).not.toMatch(/createPaymentIntent/);
      expect(source, file).not.toMatch(/confirmStripePayment/);
      expect(source, file).not.toMatch(/\.processPayment\s*\(/);
    }
  });

  it('[events] cart UX events never emit payment capture timeline events', () => {
    const cartEvents = read('src/core/cart/cartEvents.ts');
    const timeline = read('src/core/commerce/commerceTimelineService.ts');
    expect(cartEvents).not.toMatch(/checkout\.payment_confirmed/);
    expect(cartEvents).not.toMatch(/payment_intent/);
    expect(timeline).toMatch(/checkout\.session_created/);
  });

  it('[webhook] duplicate payment_intent.succeeded does not double-finalize', async () => {
    const { flow, confirmStripePayment } = makeWebhookFlow();

    const first = await flow.handleCheckoutWebhook({ rawBody: '{}', signature: 'sig' });
    const second = await flow.handleCheckoutWebhook({ rawBody: '{}', signature: 'sig' });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.duplicate).toBe(true);
    expect(confirmStripePayment).toHaveBeenCalledTimes(1);
  });
});
