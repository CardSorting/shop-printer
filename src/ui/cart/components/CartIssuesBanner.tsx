'use client';

import { AlertCircle } from 'lucide-react';
import type { CartIssue } from '@core/cart';
import { formatCartIssues } from '../formatCartIssues';

type CartIssuesBannerProps = {
  issues: CartIssue[];
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function CartIssuesBanner({ issues, onRefresh, refreshing }: CartIssuesBannerProps) {
  if (issues.length === 0) return null;

  const messages = formatCartIssues(issues);

  return (
    <div
      className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4"
      role="alert"
      data-testid="cart-issues-banner"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-black text-amber-900">Your cart needs attention before checkout</p>
          <ul className="space-y-1">
            {messages.map((message) => (
              <li key={message} className="text-sm font-medium text-amber-800">
                {message}
              </li>
            ))}
          </ul>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="mt-2 text-xs font-bold uppercase tracking-widest text-amber-900 hover:text-amber-950 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing…' : 'Refresh cart'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
