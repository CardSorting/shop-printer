import { NextResponse } from 'next/server';
import type { CartErrorCode, CartResult } from '@core/cart';

function statusForCode(code: CartErrorCode): number {
  switch (code) {
    case 'product_not_found':
    case 'cart_empty':
    case 'discount_invalid':
      return 404;
    case 'insufficient_stock':
    case 'cart_invalid':
    case 'cart_expired':
      return 409;
    case 'unauthorized':
      return 401;
    default:
      return 500;
  }
}

export function cartRouteResponse<T>(result: CartResult<T>, successStatus = 200) {
  if (!result.ok) {
    return NextResponse.json(result, { status: statusForCode(result.code) });
  }
  return NextResponse.json(result, { status: successStatus });
}
