import type { ICartRepository, IProductRepository } from '@domain/repositories';
import type { DiscountService } from '../DiscountService';
import type { InventoryApplicationService } from '../inventory/inventoryApplicationService';
import type { CartApplicationService } from './cartApplicationService';
import { CartFlowService } from './cartFlowService';
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
  validation: CartValidationService;
  events: CartUxEventBus;
};

export function createCartStack(deps: CartStackDeps): CartStack {
  const events = deps.events ?? new CartUxEventBus();
  const productReadModel = new ProductReadModel(deps.productRepo);
  const availabilityReader = new InventoryAvailabilityReader({ inventory: deps.inventory });
  const pricingSnapshot = new PricingSnapshotService();
  const validation = new CartValidationService({
    productReadModel,
    availabilityReader,
    pricingSnapshot,
    discountService: deps.discountService,
  });
  const cart = new CartFlowService({
    cartRepo: deps.cartRepo,
    productReadModel,
    availabilityReader,
    pricingSnapshot,
    validation,
    discountService: deps.discountService,
    events,
  });

  return { cart, validation, events };
}
