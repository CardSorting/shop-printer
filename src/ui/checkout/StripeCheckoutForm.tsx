'use client';

/**
 * [LAYER: UI]
 * Stripe confirmation surface. Checkout reservation, PaymentIntent creation,
 * and local finalization remain behind the centralized checkout API client.
 */
import { useEffect, useRef, useState } from 'react';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { AlertCircle, CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import type { Address } from '@domain/models';
import { validateAddress } from '@utils/validators';
import { stripePromise } from './stripeClient';
import {
  checkoutSessionNeedsPayment,
  markCheckoutPaymentSubmitted,
  type ClientCheckoutSession,
} from './clientCheckoutState';

interface StripeCheckoutFormProps {
  address: Address;
  email: string;
  requiresShipping: boolean;
  initialSession?: ClientCheckoutSession | null;
  onCreateSession: () => Promise<ClientCheckoutSession>;
  onPaymentConfirmed: (session: ClientCheckoutSession, paymentStatus?: string) => Promise<void>;
  onPlaceOrder: (isPlacing: boolean, phase?: 'authorizing' | 'finalizing') => void;
  isPlacing: boolean;
}

function paymentErrorMessage(code: string | undefined, message: string | undefined): string {
  if (code === 'card_declined') return 'Your card was declined. Try another card or contact your bank.';
  if (code === 'expired_card') return 'Your card has expired. Please use a different card.';
  if (code === 'incorrect_cvc') return 'The CVC is incorrect. Check it and try again.';
  if (code === 'insufficient_funds') return 'This card has insufficient funds. Please use a different payment method.';
  return message || 'Payment could not be completed. Please try again.';
}

function useMountedRef() {
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  return mounted;
}

function StripeCheckoutFields(props: StripeCheckoutFormProps) {
  const {
    address,
    email,
    requiresShipping,
    initialSession,
    onCreateSession,
    onPaymentConfirmed,
    onPlaceOrder,
    isPlacing,
  } = props;
  const stripe = useStripe();
  const elements = useElements();
  const mounted = useMountedRef();
  const operationInFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFinalization, setPendingFinalization] = useState<ClientCheckoutSession | null>(null);

  useEffect(() => {
    if (initialSession && checkoutSessionNeedsPayment(initialSession)) {
      setPendingFinalization(null);
    }
  }, [initialSession]);

  const runCheckout = async (skipStripeConfirmation = false) => {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    const finalizationSession = pendingFinalization
      ?? (initialSession && !checkoutSessionNeedsPayment(initialSession) ? initialSession : null);
    if (finalizationSession) {
      onPlaceOrder(true, 'finalizing');
      setError(null);
      try {
        await onPaymentConfirmed(finalizationSession, finalizationSession.paymentStatus);
        if (mounted.current) setPendingFinalization(null);
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err.message : 'Order confirmation is delayed. Check again in a moment.');
      } finally {
        operationInFlight.current = false;
        if (mounted.current) onPlaceOrder(false);
      }
      return;
    }

    if (!skipStripeConfirmation && (!stripe || !elements)) {
      operationInFlight.current = false;
      return;
    }
    const cardElement = skipStripeConfirmation ? null : elements?.getElement(CardElement);
    if (!skipStripeConfirmation && !cardElement) {
      operationInFlight.current = false;
      return;
    }

    onPlaceOrder(true, 'authorizing');
    setError(null);

    try {
      const session = initialSession ?? await onCreateSession();
      if (!checkoutSessionNeedsPayment(session)) {
        if (mounted.current) onPlaceOrder(true, 'finalizing');
        await onPaymentConfirmed(session, session.paymentStatus);
        return;
      }

      let confirmedPaymentStatus = 'succeeded';
      if (!skipStripeConfirmation) {
        const billingAddress = requiresShipping
          ? {
              line1: address.street,
              city: address.city,
              state: address.state,
              postal_code: address.zip,
              country: address.country || 'US',
            }
          : { country: address.country || 'US' };
        const confirmation = await stripe!.confirmCardPayment(session.clientSecret, {
          payment_method: {
            card: cardElement!,
            billing_details: { email, address: billingAddress },
          },
          return_url: `${window.location.origin}/checkout`,
        });

        if (confirmation.error) {
          throw new Error(paymentErrorMessage(confirmation.error.code, confirmation.error.message));
        }
        if (!confirmation.paymentIntent || !['succeeded', 'processing'].includes(confirmation.paymentIntent.status)) {
          throw new Error(`Payment is not ready to finalize (status: ${confirmation.paymentIntent?.status ?? 'unknown'}).`);
        }
        confirmedPaymentStatus = confirmation.paymentIntent.status;
      }

      const submittedSession = markCheckoutPaymentSubmitted(session, confirmedPaymentStatus);
      if (mounted.current) {
        setPendingFinalization(submittedSession);
        onPlaceOrder(true, 'finalizing');
      }
      await onPaymentConfirmed(submittedSession, confirmedPaymentStatus);
      if (mounted.current) setPendingFinalization(null);
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : 'An unexpected payment error occurred.');
      }
    } finally {
      operationInFlight.current = false;
      if (mounted.current) onPlaceOrder(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runCheckout(false);
  };

  const isAddressValid = !requiresShipping || validateAddress(address).valid;

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <CreditCard className="h-5 w-5 text-primary-600" />
          Payment details
        </h2>
        <div className="flex gap-1">
          {['VISA', 'MC', 'AMEX'].map((brand) => (
            <div key={brand} className="flex h-6 w-9 items-center justify-center rounded border bg-gray-100 text-[8px] font-bold text-gray-400">{brand}</div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm ring-1 ring-gray-900/5 transition-all focus-within:ring-2 focus-within:ring-primary-500">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#111827',
              fontFamily: 'Inter, system-ui, sans-serif',
              '::placeholder': { color: '#9ca3af' },
            },
            invalid: { color: '#dc2626' },
          },
        }} />
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="mb-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {process.env.NEXT_PUBLIC_E2E_MOCK_CHECKOUT === '1' && (
        <button
          type="button"
          data-testid="mock-checkout-button"
          disabled={isPlacing || !isAddressValid}
          onClick={() => void runCheckout(true)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 py-3 text-sm font-black text-amber-900 disabled:opacity-50"
        >
          Mock Pay (E2E)
        </button>
      )}

      <button
        type="submit"
        disabled={!stripe || isPlacing || !isAddressValid}
        aria-busy={isPlacing}
        className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 font-bold text-white shadow-lg transition-all hover:bg-black hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
      >
        {isPlacing ? (
          <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing securely...</>
        ) : pendingFinalization || (initialSession && !checkoutSessionNeedsPayment(initialSession)) ? (
          <>Check payment status <ShieldCheck className="h-4 w-4" /></>
        ) : (
          <>Pay &amp; Place Order <LockKeyhole className="h-4 w-4 text-gray-400 transition-colors group-hover:text-white" /></>
        )}
      </button>

      {pendingFinalization && (
        <p className="mt-3 text-center text-xs font-medium text-amber-700">Your payment was submitted. Check its status without entering or charging the card again.</p>
      )}

      <div className="mt-6 flex items-center justify-center gap-4 border-t pt-6 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-green-600" /> SSL secure</span>
        <span className="h-3 w-px bg-gray-200" />
        <span className="flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-green-600" /> Encrypted</span>
        <span className="h-3 w-px bg-gray-200" />
        <span>Stripe verified</span>
      </div>
    </form>
  );
}

function MockCheckoutForm(props: StripeCheckoutFormProps) {
  const mounted = useMountedRef();
  const operationInFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    props.onPlaceOrder(true, 'authorizing');
    setError(null);
    try {
      const session = props.initialSession ?? await props.onCreateSession();
      if (mounted.current) props.onPlaceOrder(true, 'finalizing');
      await props.onPaymentConfirmed(markCheckoutPaymentSubmitted(session, 'succeeded'), 'succeeded');
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Mock checkout failed.');
    } finally {
      operationInFlight.current = false;
      if (mounted.current) props.onPlaceOrder(false);
    }
  };

  return (
    <div className="p-6">
      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <button
        type="button"
        data-testid="mock-checkout-button"
        disabled={props.isPlacing || (props.requiresShipping && !validateAddress(props.address).valid)}
        onClick={() => void run()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 py-4 text-sm font-black text-amber-900 disabled:opacity-50"
      >
        {props.isPlacing ? 'Processing mock checkout...' : 'Mock Pay (E2E)'}
      </button>
    </div>
  );
}

export function StripeCheckoutForm(props: StripeCheckoutFormProps) {
  if (!stripePromise) {
    return process.env.NEXT_PUBLIC_E2E_MOCK_CHECKOUT === '1' ? <MockCheckoutForm {...props} /> : null;
  }

  return (
    <Elements stripe={stripePromise}>
      <StripeCheckoutFields {...props} />
    </Elements>
  );
}
