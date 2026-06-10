import type { CartIssue } from '@core/cart';

const ISSUE_ACTIONS: Partial<Record<CartIssue['code'], string>> = {
  pricing_changed: 'Refresh your cart to see updated prices.',
  out_of_stock: 'Remove or reduce quantity before checkout.',
  product_unavailable: 'Remove unavailable items to continue.',
  product_not_found: 'Remove items that are no longer sold.',
  variant_not_found: 'Re-select a valid variant or remove the item.',
  quantity_invalid: 'Adjust quantity within the allowed limit.',
  discount_invalid: 'Remove or replace the promo code.',
  discount_expired: 'This promo has expired — remove it to continue.',
  cart_expired: 'Your cart expired — review items before checkout.',
};

export function formatCartIssue(issue: CartIssue): string {
  const action = ISSUE_ACTIONS[issue.code];
  return action ? `${issue.message} ${action}` : issue.message;
}

export function formatCartIssues(issues: CartIssue[]): string[] {
  return issues.map(formatCartIssue);
}
