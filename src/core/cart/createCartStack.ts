import type { ICartRepository, IDiscountRepository, IOrderRepository, IProductRepository } from '@domain/repositories';
import { CartService } from '../CartService';
import type { DiscountService } from '../DiscountService';
import type { InventoryApplicationService } from '../inventory/inventoryApplicationService';
import { CartApplicationServiceImpl } from './cartApplicationService';
import type { CartApplicationService } from './cartApplicationService';
import { CartFlowService } from './cartFlowService';
import { CartStore } from './cartStore';
import { CartUxEventBus } from './cartEvents';
import { CartValidationService } from './cartValidationService';
import { InventoryAvailabilityReader } from './inventoryAvailabilityReader';
import { PricingSnapshotService } from './pricingSnapshotService';
import { ProductReadModel } from './productReadModel';

export type CartStackDeps = {
  cartRepo: ICartRepository;
  productRepo: IProductRepository;
  inventory?: Pick<InventoryApplicationService, 'checkAvailability'>;
  discountService?: DiscountService;
  events?: CartUxEventBus;
};

export type CartStack = {
  cart: CartApplicationService;
  flow: CartFlowService;
  validation: CartValidationService;
  events: CartUxEventBus;
  /** @deprecated Use `cart` application service — persistence shim for legacy callers. */
  cartService: CartService;
};

export function createCartStack(deps: CartStackDeps): CartStack {
  const events = deps.events ?? new CartUxEventBus();
  const productReadModel = new ProductReadModel(deps.productRepo);
  const availabilityReader = new InventoryAvailabilityReader({ inventory: deps.inventory });
  const pricingSnapshot = new PricingSnapshotService();
  const cartService = new CartService(deps.cartRepo, deps.productRepo, deps.inventory);
  const store = new CartStore(cartService);
  const validation = new CartValidationService({
    productReadModel,
    availabilityReader,
    pricingSnapshot,
    discountService: deps.discountService,
  });
  const flow = new CartFlowService({
    store,
    productReadModel,
    availabilityReader,
    pricingSnapshot,
    validation,
    discountService: deps.discountService,
    events,
  });
  const cart = new CartApplicationServiceImpl(flow);

  return { cart, flow, validation, events, cartService };
}
