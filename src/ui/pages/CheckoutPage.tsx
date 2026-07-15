'use client';

/**
 * [LAYER: UI]
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { STORE_PATHS } from '@utils/navigation';
import Image from 'next/image';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  HelpCircle,
  Info,
  Lock,
  LockKeyhole,
  Mail,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Tag,
  Truck,
} from 'lucide-react';
import type { Address, Order } from '@domain/models';
import { logger } from '@utils/logger';
import { CartIssuesBanner } from '@ui/cart';
import {
  CheckoutFinalizationError,
  checkoutStatusNeedsPayment,
  checkoutStatusRequiresRestart,
  clearActiveCheckoutSession,
  createClientCheckoutSession,
  gateCheckoutCommit,
  getOrCreateCheckoutAttemptKey,
  isStripeConfigured,
  markCheckoutPaymentRequired,
  markCheckoutPaymentSubmitted,
  readActiveCheckoutSession,
  saveActiveCheckoutSession,
  type ClientCheckoutSession,
} from '@ui/checkout';
import { OrderConfirmation } from '../checkout/OrderConfirmation';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useServices } from '../hooks/useServices';
import { formatMoney } from '@utils/formatters';
import { SITE_CART_EMPTY_LINE, SITE_GATHERING_LINE, SITE_NEWSLETTER_LINE } from '@utils/seo';
import { calculateCheckoutShipping, calculateTax, FREE_SHIPPING_THRESHOLD_CENTS } from '@domain/rules';
import type { ShippingRate, ShippingZone } from '@domain/models';


const StripeCheckoutForm = lazy(() => import('../checkout/StripeCheckoutForm').then((module) => ({ default: module.StripeCheckoutForm })));
const checkoutPaymentUiAvailable = isStripeConfigured || process.env.NEXT_PUBLIC_E2E_MOCK_CHECKOUT === '1';

type CheckoutStep = 'information' | 'shipping' | 'payment';
type CheckoutResumeState = 'checking' | 'idle' | 'resuming' | 'recovering';
type ResumeOrderState = 'idle' | 'loading' | 'ready' | 'failed';

type CheckoutFieldErrors = Partial<Record<'email' | 'street' | 'city' | 'state' | 'zip', string>>;

const CHECKOUT_STEPS: Array<{ id: CheckoutStep; label: string }> = [
  { id: 'information', label: 'Information' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'payment', label: 'Payment' },
];


function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateCheckoutDetails(email: string, address: Address, isPurelyDigital: boolean = false): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  if (!validateEmail(email)) errors.email = 'Enter a valid email address for your receipt and delivery updates.';
  
  if (!isPurelyDigital) {
    if (!address.street.trim()) errors.street = 'Enter the street address where your order should ship.';
    if (!address.city.trim()) errors.city = 'Enter a city.';
    if (!address.state.trim()) errors.state = 'Enter a state or region.';
    if (!address.zip.trim()) errors.zip = 'Enter a ZIP or postal code.';
  }
  return errors;
}

function parseSavedCheckoutAddress(raw: string): Address | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value as Partial<Address>;
    if (
      typeof candidate.street !== 'string'
      || typeof candidate.city !== 'string'
      || typeof candidate.state !== 'string'
      || typeof candidate.zip !== 'string'
      || typeof candidate.country !== 'string'
    ) return null;
    return {
      street: candidate.street,
      city: candidate.city,
      state: candidate.state,
      zip: candidate.zip,
      country: candidate.country.trim().toUpperCase() || 'US',
    };
  } catch {
    return null;
  }
}

function readCheckoutPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeCheckoutPreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Checkout remains usable without preference persistence.
  }
}

function removeCheckoutPreference(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing else can be cleared when browser storage is unavailable.
  }
}

import { Stepper } from '../components/Stepper';

export function CheckoutPage() {
  const { user, loading: loadingAuth } = useAuth();
  const { cart, loading: loadingCart, subtotal, viewState, refreshCart } = useCart();
  const services = useServices();

  const [step, setStep] = useState<CheckoutStep>('information');
  const [isSuccess, setIsSuccess] = useState(false);
  const [finalOrder, setFinalOrder] = useState<Order | null>(null);
  const [address, setAddress] = useState<Address>({ street: '', city: '', state: '', zip: '', country: 'US' });
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [placing, setPlacing] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'authorizing' | 'finalizing'>('idle');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [discountCode, setDiscountCode] = useState('');
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    freeShipping: boolean;
    validatedSubtotal: number;
  } | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [shippingResult, setShippingResult] = useState<{ available: boolean; amount: number; rateName: string; shippingClassId?: string } | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [activeCheckoutSession, setActiveCheckoutSession] = useState<ClientCheckoutSession | null>(null);
  const [resumeOrder, setResumeOrder] = useState<Order | null>(null);
  const [resumeOrderState, setResumeOrderState] = useState<ResumeOrderState>('idle');
  const [resumeOrderNonce, setResumeOrderNonce] = useState(0);
  const [returnPaymentIntent, setReturnPaymentIntent] = useState<string | null>(null);
  const [checkoutResumeState, setCheckoutResumeState] = useState<CheckoutResumeState>('checking');
  const [recoveryNonce, setRecoveryNonce] = useState(0);
  const [checkoutRestartRequired, setCheckoutRestartRequired] = useState(false);
  const checkoutAttemptKey = useRef("");
  const activePaymentIntentId = activeCheckoutSession?.paymentIntentId;
  const activeOrderId = activeCheckoutSession?.orderId;

  const commitCheckoutSuccess = useCallback((order: Order): void => {
    setFinalOrder(order);
    setIsSuccess(true);
    setActiveCheckoutSession(null);
    setResumeOrder(null);
    setResumeOrderState('idle');
    clearActiveCheckoutSession();
    checkoutAttemptKey.current = '';
    removeCheckoutPreference('checkout:discountCode');
  }, []);

  const resetCanceledCheckout = useCallback((): void => {
    clearActiveCheckoutSession();
    checkoutAttemptKey.current = getOrCreateCheckoutAttemptKey();
    setActiveCheckoutSession(null);
    setResumeOrder(null);
    setResumeOrderState('idle');
    setCheckoutRestartRequired(true);
    void refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    if (!loadingCart && user) {
      void refreshCart();
    }
  }, [loadingCart, user, refreshCart]);

  useEffect(() => {
    checkoutAttemptKey.current = getOrCreateCheckoutAttemptKey();
    const paymentIntentFromReturn = new URLSearchParams(window.location.search).get('payment_intent');
    setReturnPaymentIntent(paymentIntentFromReturn);

    const savedAddress = readCheckoutPreference('checkout:address');
    if (savedAddress) {
      const parsedAddress = parseSavedCheckoutAddress(savedAddress);
      if (parsedAddress) setAddress(parsedAddress);
      else removeCheckoutPreference('checkout:address');
    }
    
    const savedDiscount = readCheckoutPreference('checkout:discountCode');
    if (savedDiscount) {
      setDiscountCode(savedDiscount);
    }
  }, []);

  useEffect(() => {
    if (loadingAuth) return;
    const savedSession = readActiveCheckoutSession(user?.id);
    setActiveCheckoutSession(savedSession);
    if (savedSession) {
      checkoutAttemptKey.current = savedSession.attemptKey;
      setStep('payment');
      setResumeOrderState(user ? 'loading' : 'ready');
      if (!user) setCheckoutError('Sign in to resume this saved checkout session.');
    } else {
      checkoutAttemptKey.current = getOrCreateCheckoutAttemptKey();
      setResumeOrderState('idle');
    }
    setCheckoutResumeState(returnPaymentIntent ? 'recovering' : savedSession ? 'resuming' : 'idle');
  }, [loadingAuth, returnPaymentIntent, user?.id]);

  useEffect(() => {
    if (user) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (!activeOrderId || !user || resumeOrderState !== 'loading') return;
    let cancelled = false;
    void services.orderService.getOrder(activeOrderId)
      .then((order) => {
        if (cancelled) return;
        if (
          order.paymentState === 'paid'
          || ['confirmed', 'processing', 'delivered', 'ready_for_pickup', 'delivery_started'].includes(order.status)
        ) {
          commitCheckoutSuccess(order);
          return;
        }
        if (order.status === 'cancelled') {
          resetCanceledCheckout();
          setStep('information');
          setCheckoutError('This checkout session expired before payment. Your cart is being restored so you can start again.');
          return;
        }
        setResumeOrder(order);
        setResumeOrderState('ready');
        if (order.shippingAddress) setAddress(order.shippingAddress);
      })
      .catch((error) => {
        if (cancelled) return;
        logger.warn('Unable to load the resumable checkout order', error);
        setResumeOrderState('failed');
        setCheckoutError('We could not reload this checkout reservation. Retry before entering payment details; your saved payment status has not been changed.');
      });
    return () => { cancelled = true; };
  }, [activeOrderId, commitCheckoutSuccess, resetCanceledCheckout, resumeOrderNonce, resumeOrderState, services.orderService, user]);

  useEffect(() => {
    if (!returnPaymentIntent || loadingAuth) return;
    if (!user) {
      setCheckoutError('Sign in to finish confirming your payment. Your checkout session is still saved in this tab.');
      setCheckoutResumeState(activeCheckoutSession ? 'resuming' : 'idle');
      return;
    }

    let cancelled = false;
    setPlacing(true);
    setCheckoutStatus('finalizing');
    void services.checkout.finalize(
      user.id,
      returnPaymentIntent,
      activePaymentIntentId === returnPaymentIntent ? activeOrderId : undefined,
    ).then((order) => {
      if (cancelled) return;
      commitCheckoutSuccess(order);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('payment_intent');
      cleanUrl.searchParams.delete('payment_intent_client_secret');
      cleanUrl.searchParams.delete('redirect_status');
      window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    }).catch((error) => {
      if (cancelled) return;
      if (error instanceof CheckoutFinalizationError && checkoutStatusNeedsPayment(error.paymentStatus)) {
        setActiveCheckoutSession((current) => {
          if (!current) return current;
          const paymentRequired = markCheckoutPaymentRequired(current, error.paymentStatus);
          saveActiveCheckoutSession(paymentRequired);
          return paymentRequired;
        });
      } else if (error instanceof CheckoutFinalizationError && checkoutStatusRequiresRestart(error.paymentStatus)) {
        resetCanceledCheckout();
      }
      setCheckoutError(error instanceof Error ? error.message : 'Payment confirmation is delayed. Check its status again in a moment.');
      setCheckoutResumeState(activeOrderId ? 'resuming' : 'idle');
    }).finally(() => {
      if (cancelled) return;
      setPlacing(false);
      setCheckoutStatus('idle');
    });

    return () => { cancelled = true; };
  }, [activeOrderId, activePaymentIntentId, commitCheckoutSuccess, loadingAuth, recoveryNonce, resetCanceledCheckout, returnPaymentIntent, services.checkout, user]);

  useEffect(() => {
    const loadShippingConfig = async () => {
      setLoadingShipping(true);
      try {
        const [rates, zones] = await Promise.all([
          services.shippingService.getAllRates(),
          services.shippingService.getAllZones(),
        ]);
        setShippingRates(rates);
        setShippingZones(zones);
      } catch (err) {
        logger.error('Failed to load shipping config', err);
      } finally {
        setLoadingShipping(false);
      }
    };
    void loadShippingConfig();
  }, [services.shippingService]);
  
  const cartItems = cart?.items ?? [];
  const displayItems = useMemo(() => {
    if (cartItems.length > 0) return cartItems;
    return (resumeOrder?.items ?? []).map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      priceSnapshot: item.unitPrice,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
      isDigital: item.isDigital,
      shippingClassId: item.shippingClassId,
      customImages: item.customImages,
    })).map((item) => ({ ...item, imageUrl: item.imageUrl || '/images/seo/menu-placeholder.png' }));
  }, [cartItems, resumeOrder]);

  useEffect(() => {
    writeCheckoutPreference('checkout:address', JSON.stringify(address));
  }, [address]);

  const isPurelyDigital = useMemo(() => {
    if (activeCheckoutSession) return !activeCheckoutSession.requiresShipping;
    return displayItems.length > 0 && displayItems.every(item => item.isDigital);
  }, [activeCheckoutSession, displayItems]);

  const checkoutSubtotal = cartItems.length > 0
    ? subtotal
    : displayItems.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);

  useEffect(() => {
    const result = calculateCheckoutShipping(
      displayItems,
      address,
      shippingRates,
      shippingZones,
      { subtotal: checkoutSubtotal, freeShipping: appliedDiscount?.freeShipping },
    );
    setShippingResult(result);
  }, [address, appliedDiscount?.freeShipping, checkoutSubtotal, displayItems, shippingRates, shippingZones]);

  const shipping = activeCheckoutSession && resumeOrder
    ? resumeOrder.shippingAmount
    : shippingResult?.amount ?? 0;
  const shippingName = activeCheckoutSession && resumeOrder
    ? String(resumeOrder.metadata?.shippingRateName || (isPurelyDigital ? 'Digital Delivery' : 'Shipping'))
    : shippingResult?.rateName ?? 'Shipping';

  const discountAmount = activeCheckoutSession && resumeOrder
    ? resumeOrder.discountAmount ?? 0
    : appliedDiscount?.amount ?? 0;
  
  // Tax estimation based on domain rules
  const taxAmount = useMemo(() => {
    if (activeCheckoutSession && resumeOrder) return resumeOrder.taxAmount;
    return calculateTax({ 
      subtotal: checkoutSubtotal,
      shipping, 
      discount: discountAmount, 
      address 
    });
  }, [activeCheckoutSession, address, checkoutSubtotal, discountAmount, resumeOrder, shipping]);

  const total = Math.max(0, checkoutSubtotal + shipping + taxAmount - discountAmount);
  const displayTotal = activeCheckoutSession?.amount ?? total;
  const displayTotalItems = displayItems.reduce((sum, item) => sum + item.quantity, 0);
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - checkoutSubtotal);
  const currentStepIndex = CHECKOUT_STEPS.findIndex((item) => item.id === step);

  function goToStep(nextStep: CheckoutStep) {
    if (nextStep === 'shipping' && isPurelyDigital) {
      goToStep('payment');
      return;
    }

    if (nextStep === 'payment' || nextStep === 'shipping') {
      const errors = validateCheckoutDetails(email, address, isPurelyDigital);
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) {
        setStep('information');
        return;
      }
      if (!isPurelyDigital && loadingShipping) {
        setCheckoutError('Shipping options are still loading. Please wait a moment and continue again.');
        return;
      }
      if (!isPurelyDigital && shippingResult?.available === false) {
        setCheckoutError('Shipping is not available for this address. Choose a supported destination before payment.');
        setStep('information');
        return;
      }
    }
    setCheckoutError(null);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const discountControllerRef = useRef<AbortController | null>(null);

  const handleApplyDiscount = async (requestedCode?: string) => {
    const rawCode = requestedCode ?? discountCode;
    if (!rawCode.trim()) return;

    discountControllerRef.current?.abort();
    const controller = new AbortController();
    discountControllerRef.current = controller;

    setIsApplying(true);
    setDiscountMessage(null);
    
    try {
      const code = rawCode.trim().toUpperCase();
      
      const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cartTotal: checkoutSubtotal }),
        signal: controller.signal
      });
      
      if (!controller.signal.aborted && res.ok) {
        const result = await res.json();
        if (result.valid) {
          const freeShipping = result.discount.type === 'free_shipping';
          const amount = freeShipping ? 0 : result.discountAmount;
          
          setAppliedDiscount({ code, amount, freeShipping, validatedSubtotal: checkoutSubtotal });
          setDiscountMessage(`${code} applied. Your discount is reflected below.`);
          writeCheckoutPreference('checkout:discountCode', code);
        } else {
          setDiscountMessage(result.message || 'That code is not available.');
        }
      } else if (!controller.signal.aborted) {
        setDiscountMessage('Unable to validate discount code. Please try again.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      logger.error('Failed to validate discount code', err);
      if (!controller.signal.aborted) {
        setDiscountMessage('Unable to validate discount code. Please try again.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsApplying(false);
        setDiscountCode('');
      }
    }
  };

  // Auto-apply saved discount
  useEffect(() => {
    if (activeCheckoutSession) return;
    const saved = readCheckoutPreference('checkout:discountCode');
    if (saved && appliedDiscount?.validatedSubtotal !== checkoutSubtotal && !isApplying) {
      setDiscountCode(saved);
      void handleApplyDiscount(saved);
    }
  }, [activeCheckoutSession, checkoutSubtotal]); // Re-validate if subtotal changes

  useEffect(() => {
    return () => discountControllerRef.current?.abort();
  }, []);

  async function createCheckoutSession(): Promise<ClientCheckoutSession> {
    if (activeCheckoutSession) return activeCheckoutSession;
    if (!user) {
      const message = 'Please sign in to complete your order. Your cart and checkout details have been saved.';
      setCheckoutError(message);
      throw new Error(message);
    }
    const errors = validateCheckoutDetails(email, address, isPurelyDigital);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const message = 'Review the highlighted checkout details before payment.';
      setCheckoutError(message);
      setStep('information');
      throw new Error(message);
    }
    if (!isPurelyDigital && (loadingShipping || !shippingResult?.available)) {
      const message = loadingShipping
        ? 'Shipping options are still loading. Please wait a moment.'
        : 'Shipping is not available for this address. Choose a supported destination before payment.';
      setCheckoutError(message);
      setStep('information');
      throw new Error(message);
    }
    const commitGate = gateCheckoutCommit(await services.cart.validateCart());
    if (commitGate.blocked) {
      const message = commitGate.message || 'Your cart needs attention before checkout.';
      setCheckoutError(message);
      setStep('information');
      throw new Error(message);
    }

    setCheckoutError(null);
    const normalizedAddress = {
      ...address,
      country: address.country.trim().toUpperCase() || 'US',
    };
    const attemptKey = checkoutAttemptKey.current || getOrCreateCheckoutAttemptKey();
    let session: ClientCheckoutSession;
    try {
      const start = await services.checkout.start(
        user.id,
        normalizedAddress,
        attemptKey,
        appliedDiscount?.code,
      );
      if (checkoutStatusRequiresRestart(start.paymentStatus)) {
        resetCanceledCheckout();
        throw new CheckoutFinalizationError(
          'The previous payment session was canceled. Return to checkout before trying again.',
          start.paymentStatus,
          false,
        );
      }
      session = createClientCheckoutSession({
        ...start,
        paymentStatus: start.paymentStatus || 'requires_payment_method',
      }, {
        ownerUserId: user.id,
        attemptKey,
        requiresShipping: !isPurelyDigital,
      });
    } catch (error) {
      if (
        error
        && typeof error === 'object'
        && 'code' in error
        && error.code === 'CHECKOUT_RESTART_REQUIRED'
      ) {
        resetCanceledCheckout();
      }
      const message = error instanceof Error ? error.message : 'Checkout could not be started. Your cart is still safe.';
      setCheckoutError(message);
      throw error;
    }
    saveActiveCheckoutSession(session);
    setActiveCheckoutSession(session);
    setResumeOrderState('ready');
    setCheckoutResumeState('resuming');
    return session;
  }

  async function finalizeCheckoutSession(session: ClientCheckoutSession, paymentStatus?: string): Promise<void> {
    if (!user) {
      const message = 'Sign in to finish confirming this payment. Do not submit the card again.';
      setCheckoutError(message);
      throw new Error(message);
    }

    setCheckoutError(null);
    setCheckoutStatus('finalizing');
    const submittedSession = markCheckoutPaymentSubmitted(session, paymentStatus || session.paymentStatus || 'processing');
    saveActiveCheckoutSession(submittedSession);
    setActiveCheckoutSession(submittedSession);
    try {
      const order = await services.checkout.finalize(
        user.id,
        session.paymentIntentId,
        session.orderId,
      );
      commitCheckoutSuccess(order);
    } catch (err) {
      if (err instanceof CheckoutFinalizationError && checkoutStatusNeedsPayment(err.paymentStatus)) {
        const paymentRequired = markCheckoutPaymentRequired(submittedSession, err.paymentStatus);
        saveActiveCheckoutSession(paymentRequired);
        setActiveCheckoutSession(paymentRequired);
      } else if (err instanceof CheckoutFinalizationError && checkoutStatusRequiresRestart(err.paymentStatus)) {
        resetCanceledCheckout();
      }
      const message = err instanceof Error ? err.message : 'Order confirmation is delayed. Do not submit payment again.';
      setCheckoutError(message);
      throw err;
    } finally {
      setCheckoutStatus('idle');
    }
  }

  useEffect(() => {
    if (checkoutError) document.getElementById('checkout-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [checkoutError]);

  if (
    loadingCart
    || loadingAuth
    || checkoutResumeState === 'checking'
    || checkoutResumeState === 'recovering'
    || (activeCheckoutSession && resumeOrderState === 'loading')
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <RefreshCcw className="mx-auto h-10 w-10 animate-spin text-primary-600" />
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
            {checkoutResumeState === 'recovering' ? 'Confirming your payment...' : 'Initializing Checkout...'}
          </p>
        </div>
      </div>
    );
  }

  if (activeCheckoutSession && resumeOrderState === 'failed' && !isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg rounded-[3rem] border border-gray-100 bg-white p-10 text-center shadow-2xl">
          <AlertCircle className="mx-auto h-16 w-16 text-amber-500" />
          <h1 className="mt-6 text-3xl font-black text-gray-900">Checkout needs to reconnect</h1>
          <p className="mt-4 text-sm font-medium leading-relaxed text-gray-600">{checkoutError}</p>
          <button
            type="button"
            onClick={() => {
              setCheckoutError(null);
              setResumeOrderState('loading');
              setResumeOrderNonce((value) => value + 1);
            }}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-8 py-5 text-sm font-black text-white hover:bg-black"
          >
            <RefreshCcw className="h-4 w-4" /> Retry checkout
          </button>
          <p className="mt-5 text-xs font-bold text-amber-700">Do not start a new payment while this session is saved.</p>
        </div>
      </div>
    );
  }

  if (checkoutRestartRequired && checkoutError && !isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg rounded-[3rem] border border-gray-100 bg-white p-10 text-center shadow-2xl">
          <AlertCircle className="mx-auto h-16 w-16 text-amber-500" />
          <h1 className="mt-6 text-3xl font-black text-gray-900">This payment session has ended</h1>
          <p className="mt-4 text-sm font-medium leading-relaxed text-gray-600">{checkoutError}</p>
          <button
            type="button"
            onClick={() => {
              const cleanUrl = new URL(window.location.href);
              cleanUrl.searchParams.delete('payment_intent');
              cleanUrl.searchParams.delete('payment_intent_client_secret');
              cleanUrl.searchParams.delete('redirect_status');
              window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
              setReturnPaymentIntent(null);
              setCheckoutRestartRequired(false);
              setCheckoutError(null);
              setStep('information');
              void refreshCart();
            }}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-8 py-5 text-sm font-black text-white hover:bg-black"
          >
            Return to checkout
          </button>
          <p className="mt-5 text-xs font-bold text-gray-500">No new payment was submitted. If your cart is still restoring, refresh once more in a moment.</p>
        </div>
      </div>
    );
  }

  if (returnPaymentIntent && !activeCheckoutSession && checkoutError && !isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg rounded-[3rem] border border-gray-100 bg-white p-10 text-center shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <RefreshCcw className="h-9 w-9" />
          </div>
          <h1 className="mt-7 text-3xl font-black text-gray-900">Payment confirmation is still open</h1>
          <p className="mt-4 text-sm font-medium leading-relaxed text-gray-600">{checkoutError}</p>
          {user ? (
            <button
              type="button"
              onClick={() => {
                setCheckoutError(null);
                setCheckoutResumeState('recovering');
                setRecoveryNonce((value) => value + 1);
              }}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-8 py-5 text-sm font-black text-white hover:bg-black"
            >
              <RefreshCcw className="h-4 w-4" /> Check payment status
            </button>
          ) : (
            <Link href="/login" className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-gray-900 px-8 py-5 text-sm font-black text-white hover:bg-black">
              Sign in to continue
            </Link>
          )}
          <p className="mt-5 text-xs font-bold text-amber-700">Do not submit another payment while this confirmation is unresolved.</p>
          <Link href="/contact" className="mt-6 inline-block text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900">Contact support</Link>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0 && !activeCheckoutSession && !isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl text-center border border-gray-100">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gray-50 text-gray-200">
            <ShoppingBag className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-3">Nothing on your tray yet</h1>
          <p className="text-gray-500 mb-10 font-medium leading-relaxed">{SITE_CART_EMPTY_LINE}</p>
          <Link href={STORE_PATHS.MENU} className="inline-flex items-center justify-center w-full rounded-2xl bg-gray-900 px-8 py-5 text-sm font-black text-white shadow-xl transition-all hover:bg-black hover:-translate-y-1">
            Browse the Menu
          </Link>
          <p className="mt-8 text-[10px] font-bold text-gray-300">{SITE_GATHERING_LINE}</p>
        </div>
      </div>
    );
  }

  if (isSuccess && finalOrder) return <OrderConfirmation order={finalOrder} userEmail={email} userName={user?.displayName} />;

  return (
    <div className="relative min-h-screen bg-white">
      {/* Background Decor */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-primary-100/20 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-blue-50/30 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-2xl font-black tracking-tighter text-gray-900">WoodBine</Link>
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-2 rounded-full border border-green-100 bg-green-50 px-4 py-1.5 md:flex">
              <LockKeyhole className="h-3.5 w-3.5 text-green-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-green-700">AES-256 SSL Secure</span>
            </div>
            <Link href="/contact" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">Help</Link>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Summary Trigger */}
      <div className="sticky top-[65px] z-40 border-b border-gray-100 bg-gray-50/95 px-4 py-4 backdrop-blur-sm lg:hidden">
        <button 
          onClick={() => setSummaryOpen(!summaryOpen)} 
          className="flex w-full items-center justify-between"
        >
          <span className="flex items-center gap-2 text-xs font-black text-gray-700">
            <ShoppingBag className="h-4 w-4" /> 
            {summaryOpen ? 'Hide' : 'Show'} summary 
            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${summaryOpen ? 'rotate-180' : ''}`} />
          </span>
          <span className="text-sm font-black text-gray-900">{formatMoney(displayTotal)}</span>
        </button>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-12">
        <main className="px-4 py-10 sm:px-6 lg:col-span-7 lg:px-12 lg:py-16">
          <Stepper 
            steps={CHECKOUT_STEPS.filter(s => !(isPurelyDigital && s.id === 'shipping'))} 
            currentStepId={step} 
            onStepClick={goToStep} 
          />

          <div className="max-w-2xl mx-auto lg:mx-0">
            {viewState.state === 'invalid' && (
              <CartIssuesBanner
                issues={viewState.issues}
                onRefresh={() => void refreshCart()}
              />
            )}

            {checkoutError && (
              <div id="checkout-error" role="alert" className="mb-10 flex gap-4 rounded-4xl border-2 border-red-100 bg-red-50 p-6 text-sm text-red-700 shadow-sm animate-in zoom-in-95">
                <AlertCircle className="h-6 w-6 shrink-0" />
                <div>
                  <p className="font-black text-lg">Action required</p>
                  <p className="mt-1 font-medium opacity-80">{checkoutError}</p>
                </div>
              </div>
            )}

            {step === 'information' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <section>
                  <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-black tracking-tight text-gray-900" data-testid="checkout-title">Collector Identity</h1>
                    {!user && <Link href="/login" className="text-xs font-black uppercase tracking-widest text-primary-600 hover:underline">Log in</Link>}
                  </div>
                  
                  <div className="space-y-4">
                    <FormField 
                      label="Email for receipt" 
                      id="checkout-email" 
                      type="email" 
                      autoComplete="email" 
                      error={fieldErrors.email} 
                      value={email} 
                      onChange={setEmail} 
                      placeholder="you@example.com"
                      readOnly={!!user}
                      icon={<Mail className="h-4 w-4" />}
                    />
                    <label className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 transition hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" className="h-5 w-5 rounded-lg border-gray-200 text-primary-600 focus:ring-primary-500" />
                      <span className="text-xs font-bold text-gray-600">{SITE_NEWSLETTER_LINE}</span>
                    </label>
                  </div>
                </section>

                {!isPurelyDigital && (
                  <section>
                    <h2 className="mb-8 text-3xl font-black tracking-tight text-gray-900">Destination</h2>
                    <div className="grid grid-cols-1 gap-6">
                      <FormField 
                        label="Street Address" 
                        id="checkout-street"
                        autoComplete="shipping street-address" 
                        error={fieldErrors.street} 
                        value={address.street} 
                        onChange={(val) => setAddress(prev => ({ ...prev, street: val }))} 
                        placeholder="Street address, suite, or apartment" 
                      />
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <FormField 
                          label="City" 
                          id="checkout-city"
                          autoComplete="shipping address-level2" 
                          error={fieldErrors.city}
                          value={address.city} 
                          onChange={(val) => setAddress(prev => ({ ...prev, city: val }))} 
                        />
                        <div className="grid grid-cols-2 gap-6">
                          <FormField 
                            label="State" 
                            id="checkout-state"
                            autoComplete="shipping address-level1" 
                            error={fieldErrors.state}
                            value={address.state} 
                            onChange={(val) => setAddress(prev => ({ ...prev, state: val }))} 
                          />
                          <FormField 
                            label="ZIP Code" 
                            id="checkout-zip"
                            autoComplete="shipping postal-code" 
                            error={fieldErrors.zip}
                            value={address.zip} 
                            onChange={(val) => setAddress(prev => ({ ...prev, zip: val }))} 
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                <div className="flex flex-col-reverse gap-6 pt-8 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100">
                  <Link href="/cart" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to cart
                  </Link>
                  <button 
                    onClick={() => goToStep(isPurelyDigital ? 'payment' : 'shipping')} 
                    data-testid="continue-to-shipping" 
                    className="group relative overflow-hidden rounded-2xl bg-gray-900 px-10 py-5 text-sm font-black text-white shadow-2xl transition-all hover:bg-black hover:-translate-y-1 active:translate-y-0"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {isPurelyDigital ? 'Continue to Payment' : 'Continue to Shipping'} 
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 z-0 bg-linear-to-r from-primary-600 to-blue-600 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </div>
              </div>
            )}

            {step === 'shipping' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <ReviewCard email={email} address={address} shipping={shipping} shippingName={shippingName} requiresShipping onChange={setStep} />
                
                <section>
                  <h1 className="mb-8 text-3xl font-black tracking-tight text-gray-900">Delivery Speed</h1>
                  <div className="group relative overflow-hidden rounded-4xl border-2 border-primary-500 bg-primary-50/20 p-8 shadow-lg shadow-primary-100 transition-all hover:shadow-xl">
                    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary-500/10 blur-2xl" />
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg">
                          <Truck className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-gray-900">{shippingName}</p>
                          <p className="mt-1 text-sm font-medium text-gray-500">
                            {shipping === 0 ? 'Complimentary shipping for your order' : 'Tracked & packed in protective sleeves'} • 3–5 business days
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-black text-primary-700">{shipping === 0 ? 'FREE' : formatMoney(shipping)}</span>
                    </div>
                  </div>
                </section>


                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6 text-sm text-blue-800">
                  <div className="flex gap-4">
                    <Info className="h-5 w-5 shrink-0 text-blue-600" />
                    <p className="font-medium">Almost there. You'll be able to review all details and apply payment on the next step.</p>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-6 pt-8 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100">
                  <button onClick={() => setStep('information')} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4" /> Edit Address
                  </button>
                  <button 
                    onClick={() => goToStep('payment')} 
                    data-testid="continue-to-payment" 
                    className="group relative overflow-hidden rounded-2xl bg-gray-900 px-10 py-5 text-sm font-black text-white shadow-2xl transition-all hover:bg-black hover:-translate-y-1"
                  >
                    <span className="relative z-10 flex items-center gap-2">Continue to Payment <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                    <div className="absolute inset-0 z-0 bg-linear-to-r from-primary-600 to-blue-600 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </div>
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <ReviewCard
                  email={email}
                  address={address}
                  shipping={shipping}
                  shippingName={shippingName}
                  requiresShipping={!isPurelyDigital}
                  locked={Boolean(activeCheckoutSession)}
                  onChange={setStep}
                />
                
                <section>
                  <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-3xl font-black tracking-tight text-gray-900" data-testid="payment-header">Secure Payment</h1>
                    <div className="flex items-center gap-2 grayscale opacity-50">
                      <CreditCard className="h-5 w-5" />
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl shadow-gray-200/50">
                    <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Order Commitment</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-600">
                          {isPurelyDigital ? 'Instant digital fulfillment' : `${displayTotalItems} Items ready for shipment`}
                        </span>
                        <span className="text-2xl font-black text-gray-900">{formatMoney(displayTotal)}</span>
                      </div>
                    </div>
                    
                    <div className="p-8">
                      {!user ? (
                        <div className="rounded-2xl border-2 border-amber-100 bg-amber-50/50 p-6 text-center">
                          <LockKeyhole className="mx-auto h-8 w-8 text-amber-600" />
                          <h3 className="mt-3 text-sm font-black text-amber-900">Sign in before payment</h3>
                          <p className="mt-2 text-xs font-medium leading-relaxed text-amber-700">Your checkout details are saved. Authentication is required before a card can be submitted or a saved payment can be verified.</p>
                          <Link href="/login" className="mt-5 inline-flex rounded-xl bg-gray-900 px-6 py-3 text-xs font-black text-white hover:bg-black">Sign in to continue</Link>
                        </div>
                      ) : checkoutPaymentUiAvailable ? (
                        <Suspense fallback={<div className="flex flex-col items-center justify-center p-12 text-gray-400"><RefreshCcw className="h-8 w-8 animate-spin mb-4" /><p className="text-xs font-black uppercase tracking-widest">Securing Connection...</p></div>}>
                          <StripeCheckoutForm 
                            address={address}
                            email={email}
                            requiresShipping={activeCheckoutSession?.requiresShipping ?? !isPurelyDigital}
                            initialSession={activeCheckoutSession}
                            onCreateSession={createCheckoutSession}
                            onPaymentConfirmed={finalizeCheckoutSession}
                            onPlaceOrder={(isPlacing, phase) => {
                              setPlacing(isPlacing);
                              setCheckoutStatus(isPlacing ? phase ?? 'authorizing' : 'idle');
                            }}
                            isPlacing={placing || checkoutStatus !== 'idle'} 
                          />
                        </Suspense>
                      ) : (
                        <div className="flex items-start gap-4 rounded-2xl border-2 border-amber-100 bg-amber-50/50 p-6">
                          <Info className="h-6 w-6 shrink-0 text-amber-600" />
                          <div>
                            <h3 className="text-sm font-black text-amber-900">Secure checkout is temporarily unavailable</h3>
                            <p className="mt-1 text-xs font-medium leading-relaxed text-amber-700">
                              Payment has not been configured for this storefront. Your cart and checkout details remain saved; please contact support instead of sending payment outside checkout.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <div className="flex justify-center border-t border-gray-100 pt-10 grayscale opacity-40">
                  <div className="flex gap-10">
                    <div className="flex items-center gap-2"><Lock className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">PCI-DSS</span></div>
                    <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">Secure Cloud</span></div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">Verified Auth</span></div>
                  </div>
                </div>

                {!activeCheckoutSession && (
                  <button onClick={() => setStep(isPurelyDigital ? 'information' : 'shipping')} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4" /> Back to {isPurelyDigital ? 'Information' : 'Shipping'}
                  </button>
                )}
              </div>
            )}

            <footer className="mt-24 border-t border-gray-100 pt-12 pb-8 text-center sm:text-left">
              <div className="flex flex-wrap justify-center sm:justify-start gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                <Link href="/refund-policy" className="hover:text-gray-900 transition-colors">Returns</Link>
                <Link href="/shipping-policy" className="hover:text-gray-900 transition-colors">Shipping</Link>
                <Link href="/privacy-policy" className="hover:text-gray-900 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
              </div>
              <p className="mt-8 text-[10px] font-bold text-gray-300">© 2026 WoodBine. Come for the food, stay for the people.</p>
            </footer>
          </div>
        </main>

        {/* Sidebar Summary - Enhanced Desktop */}
        <aside className={`
          fixed inset-0 z-50 transform bg-white transition-transform duration-500 lg:static lg:z-0 lg:translate-x-0
          ${summaryOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          lg:sticky lg:top-[65px] lg:col-span-5 lg:h-[calc(100vh-65px)] lg:overflow-y-auto lg:border-l lg:border-gray-100 lg:bg-gray-50/30 lg:px-12 lg:py-16
        `}>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setSummaryOpen(false)}
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 lg:hidden"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="mx-auto max-w-md p-6 lg:p-0">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white bg-white/60 p-8 shadow-2xl shadow-gray-200/40 backdrop-blur-xl">
              <div className="mb-10 flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight text-gray-900">Order Summary</h2>
                <span className="rounded-full bg-gray-900 px-4 py-1.5 text-[10px] font-black text-white">{displayTotalItems} {displayTotalItems === 1 ? 'Item' : 'Items'}</span>
              </div>
              
              <div className="max-h-[30vh] lg:max-h-80 space-y-6 overflow-y-auto pr-4 scrollbar-hide">
                {displayItems.map((item) => (
                  <div key={`${item.productId}:${item.variantId ?? 'default'}`} className="flex items-center gap-5">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-md">
                      <Image src={item.imageUrl} alt={item.name} fill sizes="80px" className="object-cover" />
                      <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-[10px] font-black text-white ring-4 ring-white shadow-lg">{item.quantity}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-gray-900">{item.name}</p>
                      <p className="mt-1 text-[10px] font-bold text-gray-400">Collector Unit • {formatMoney(item.priceSnapshot)}</p>
                      {(item as any).customImages && (item as any).customImages.slice(0, -1).filter(Boolean).length > 0 && (
                        <p className="mt-1 text-[9px] font-black uppercase text-primary-600 bg-primary-50 border border-primary-100 rounded-md px-1.5 py-0.5 w-fit">
                          {(item as any).customImages.slice(0, -1).filter(Boolean).length} / {((item as any).customImages.length - 1)} Cards Customized
                          {(item as any).customImages[(item as any).customImages.length - 1] && ' + Custom Back'}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-black text-gray-900">{formatMoney(item.priceSnapshot * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-12 border-t border-gray-100 pt-10">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Tag className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input 
                      value={discountCode} 
                      onChange={(e) => setDiscountCode(e.target.value)} 
                      placeholder="Discount code" 
                      disabled={Boolean(activeCheckoutSession)}
                      className="w-full rounded-2xl border-2 border-gray-100 bg-white/50 py-4 pl-12 pr-4 text-sm font-bold outline-none transition focus:border-primary-500 focus:bg-white" 
                    />
                  </div>
                  <button 
                    onClick={() => void handleApplyDiscount()}
                    disabled={Boolean(activeCheckoutSession) || isApplying || !discountCode.trim()}
                    className="rounded-2xl bg-gray-900 px-8 py-4 text-xs font-black text-white transition-all hover:bg-black disabled:opacity-50 active:scale-95"
                  >
                    {isApplying ? <RefreshCcw className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </button>
                </div>
                {discountMessage && (
                  <p className={`mt-4 rounded-xl px-4 py-2 text-xs font-bold animate-in slide-in-from-top-2 ${appliedDiscount ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {discountMessage}
                  </p>
                )}
                {appliedDiscount && (
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-green-200 bg-green-50/50 px-5 py-3 text-xs font-black text-green-700">
                    <span className="flex items-center gap-2"><Tag className="h-4 w-4" /> {appliedDiscount.code}</span>
                    {!activeCheckoutSession && (
                      <button onClick={() => { setAppliedDiscount(null); setDiscountMessage(null); removeCheckoutPreference('checkout:discountCode'); }} className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">Remove</button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-12 space-y-4 border-t border-gray-100 pt-10">
                <SummaryRow label="Subtotal" value={formatMoney(checkoutSubtotal)} />
                {!isPurelyDigital && (
                  <SummaryRow label={shippingName} value={shipping === 0 ? 'Free' : formatMoney(shipping)} />
                )}
                <SummaryRow label="Estimated Tax" value={formatMoney(taxAmount)} />
                {discountAmount > 0 && <SummaryRow label="Promotional Discount" value={`-${formatMoney(discountAmount)}`} isDiscount />}
                
                <div className="flex items-end justify-between border-t border-gray-900 pt-8 mt-4">
                  <span className="text-xl font-black text-gray-900 uppercase tracking-tight">Total Due</span>
                  <div className="text-right">
                    <span className="mr-2 text-[10px] font-black uppercase tracking-widest text-gray-400">USD</span>
                    <span className="text-5xl font-black tracking-tighter text-gray-900 leading-none">{formatMoney(displayTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4">
              {freeShippingRemaining > 0 ? (
                <div className="group flex items-center gap-4 rounded-3xl bg-white p-6 shadow-sm border border-gray-100 transition hover:shadow-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Unlock Free Shipping</p>
                    <p className="text-xs font-bold text-gray-400">Add {formatMoney(freeShippingRemaining)} more—regulars know it&apos;s worth it.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 rounded-3xl bg-green-500 p-6 shadow-xl text-white">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black">Free Shipping Unlocked</p>
                    <p className="text-xs font-bold opacity-80">You&apos;ve unlocked free shipping—more to share at the table.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-12 grid gap-8 border-t border-gray-200/50 pt-12">
              <TrustItem icon={<ShieldCheck className="h-5 w-5" />} title="Artist Quality" text="All products directly support independent artists." />
              <TrustItem icon={<PackageCheck className="h-5 w-5" />} title="Collector-First Packing" text="Sleeved and bubble-wrapped for maximum protection." />
              <TrustItem icon={<HelpCircle className="h-5 w-5" />} title="Premium Support" text="Priority assistance for all orders over $50." />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, isDiscount }: { label: string; value: string; isDiscount?: boolean }) {
  return (
    <div className={`flex justify-between text-sm font-bold ${isDiscount ? 'text-green-600' : 'text-gray-500'}`}>
      <span>{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

function FormField({ label, id, value, onChange, placeholder, error, type = 'text', autoComplete, icon, readOnly }: { label: string; id: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string; type?: string; autoComplete?: string; icon?: React.ReactNode; readOnly?: boolean }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{label}</label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-500">
            {icon}
          </div>
        )}
        <input 
          id={id}
          type={type}
          autoComplete={autoComplete} 
          aria-invalid={!!error} 
          aria-describedby={error ? `${id}-error` : undefined}
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          placeholder={placeholder} 
          readOnly={readOnly}
          className={`w-full rounded-2xl border-2 px-4 py-4 text-sm font-bold outline-none transition focus:ring-4 focus:ring-primary-50 ${icon ? 'pl-12' : ''} ${readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'} ${error ? 'border-red-200 focus:border-red-500' : 'border-gray-100 focus:border-primary-500'}`} 
        />
      </div>
      {error && <p id={`${id}-error`} className="mt-1 text-[10px] font-black uppercase tracking-widest text-red-600">{error}</p>}
    </div>
  );
}

function ReviewCard({
  email,
  address,
  shipping,
  shippingName,
  requiresShipping,
  locked = false,
  onChange,
}: {
  email: string;
  address: Address;
  shipping: number;
  shippingName: string;
  requiresShipping: boolean;
  locked?: boolean;
  onChange: (step: CheckoutStep) => void;
}) {
  return (
    <div className="overflow-hidden rounded-4xl border border-gray-100 bg-white shadow-lg shadow-gray-100/50 divide-y divide-gray-50">
      <ReviewRow label="Identity" value={email} onChange={locked ? undefined : () => onChange('information')} />
      {requiresShipping ? (
        <>
          <ReviewRow label="Ship to" value={`${address.street}, ${address.city}, ${address.state} ${address.zip}`} onChange={locked ? undefined : () => onChange('information')} />
          <ReviewRow label="Method" value={`${shippingName} • ${shipping === 0 ? 'Free' : formatMoney(shipping)}`} onChange={locked ? undefined : () => onChange('shipping')} />
        </>
      ) : (
        <ReviewRow label="Delivery" value="Digital delivery after payment" />
      )}
    </div>
  );
}

function ReviewRow({ label, value, onChange }: { label: string; value: string; onChange?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-6 p-6 transition hover:bg-gray-50/50 group">
      <div className="flex-1 min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{label}</span>
        <span className="block truncate text-sm font-bold text-gray-900">{value}</span>
      </div>
      {onChange && <button onClick={onChange} className="shrink-0 text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-800 transition-colors">Change</button>}
    </div>
  );
}

function TrustItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-5 group">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white text-primary-600 shadow-sm transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-900">{title}</p>
        <p className="mt-1 text-xs font-medium leading-relaxed text-gray-400">{text}</p>
      </div>
    </div>
  );
}
