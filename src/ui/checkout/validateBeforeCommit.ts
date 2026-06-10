import type { CartResult, CartValidation } from '@core/cart';
import { formatCartIssues } from '@ui/cart';

export type CheckoutCommitBlock = {
  blocked: true;
  message: string;
  issues: CartValidation['issues'];
};

export type CheckoutCommitReady = {
  blocked: false;
};

export type CheckoutCommitGate = CheckoutCommitBlock | CheckoutCommitReady;

/**
 * Commitment gate — cart must be valid before checkout captures payment.
 */
export function gateCheckoutCommit(
  result: CartResult<CartValidation>,
): CheckoutCommitGate {
  if (!result.ok) {
    return { blocked: true, message: result.message, issues: [] };
  }
  if (result.data.valid) {
    return { blocked: false };
  }
  return {
    blocked: true,
    message: formatCartIssues(result.data.issues).join(' '),
    issues: result.data.issues,
  };
}
