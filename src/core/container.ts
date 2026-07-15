/**
 * [LAYER: CORE]
 * 
 * Service Container with STRICT Lazy Initialization
 */

import { FirestoreProductRepository } from '@infrastructure/repositories/firestore/FirestoreProductRepository';
import { FirestoreCartRepository } from '@infrastructure/repositories/firestore/FirestoreCartRepository';
import { FirestoreOrderRepository } from '@infrastructure/repositories/firestore/FirestoreOrderRepository';
import { FirestoreDiscountRepository } from '@infrastructure/repositories/firestore/FirestoreDiscountRepository';
import { FirebaseAuthAdapter } from '@infrastructure/services/FirebaseAuthAdapter';
import { StripeRefundProcessor } from '@infrastructure/services/StripeRefundProcessor';
import { StripeService } from '@infrastructure/services/StripeService';
import { BrevoEmailService } from '@infrastructure/services/BrevoEmailService';
import { FirestoreSettingsRepository } from '@infrastructure/repositories/firestore/FirestoreSettingsRepository';
import { FirestoreTransferRepository } from '@infrastructure/repositories/firestore/FirestoreTransferRepository';
import { FirestorePurchaseOrderRepository } from '@infrastructure/repositories/firestore/FirestorePurchaseOrderRepository';
import { FirestoreInventoryLocationRepository } from '@infrastructure/repositories/firestore/FirestoreInventoryLocationRepository';
import { FirestoreInventoryLevelRepository } from '@infrastructure/repositories/firestore/FirestoreInventoryLevelRepository';
import { FirestoreSupplierRepository } from '@infrastructure/repositories/firestore/FirestoreSupplierRepository';
import { FirestoreCollectionRepository } from '@infrastructure/repositories/firestore/FirestoreCollectionRepository';
import { FirestoreTaxonomyRepository } from '@infrastructure/repositories/firestore/FirestoreTaxonomyRepository';
import { FirestoreWishlistRepository } from '@infrastructure/repositories/firestore/FirestoreWishlistRepository';
import { FirestoreTicketRepository } from '@infrastructure/repositories/firestore/FirestoreTicketRepository';
import { FirestoreKnowledgebaseRepository } from '@infrastructure/repositories/firestore/FirestoreKnowledgebaseRepository';
import { FirestoreShippingRepository } from '@infrastructure/repositories/firestore/FirestoreShippingRepository';
import { FirestoreLocker } from '@infrastructure/repositories/firestore/FirestoreLocker';
import { FirestoreCampaignRepository } from '@infrastructure/repositories/firestore/FirestoreCampaignRepository';
import { FirestoreCampaignEventRepository } from '@infrastructure/repositories/firestore/FirestoreCampaignEventRepository';
import { FirestoreCustomerSegmentRepository } from '@infrastructure/repositories/firestore/FirestoreCustomerSegmentRepository';
import { ProductService } from './ProductService';
import { createCartStack, type CartStack } from './cart/createCartStack';
import type { CartApplicationService } from './cart/cartApplicationService';
import { OrderService } from './OrderService';
import { createCheckoutStack } from './order/createCheckoutStack';
import type { CheckoutApplicationService } from './order/checkoutApplicationService';
import { createInventoryStack } from './inventory/createInventoryStack';
import type { InventoryApplicationService } from './inventory/inventoryApplicationService';
import { createAdminStack } from './admin/createAdminStack';
import type { AdminApplicationService } from './admin/adminApplicationService';
import { createRefundStack } from './refund/createRefundStack';
import type { RefundApplicationService } from './refund/refundApplicationService';
import { createSupportStack } from './support/createSupportStack';
import type { SupportApplicationService } from './support/supportApplicationService';
import { createCrmStack } from './crm/createCrmStack';
import type { CrmApplicationService } from './crm/crmApplicationService';
import { CommerceEventBus } from './commerce/commerceEventBus';
import { CommerceTimelineService } from './commerce/commerceTimelineService';
import { FirestoreCommerceEventStore } from '@infrastructure/commerce/FirestoreCommerceEventStore';
import { FirestoreSupportEventLog } from '@infrastructure/support/FirestoreSupportEventLog';
import { FirestoreRefundEventLog } from '@infrastructure/refund/FirestoreRefundEventLog';
import { FirestoreAdminOperatorEventLog } from '@infrastructure/admin/FirestoreAdminOperatorEventLog';
import { FirestoreCheckoutEventLog } from '@infrastructure/checkout/FirestoreCheckoutEventLog';
import { FirestoreInventoryLedgerRepository } from '@infrastructure/repositories/firestore/FirestoreInventoryLedgerRepository';
import { FirestoreInventoryReservationRepository } from '@infrastructure/repositories/firestore/FirestoreInventoryReservationRepository';
import { FirestoreInventoryReconciliationRepository } from '@infrastructure/repositories/firestore/FirestoreInventoryReconciliationRepository';
import { ShippingService } from './ShippingService';
import { AuthService } from './AuthService';
import { DiscountService } from './DiscountService';
import { SettingsService } from './SettingsService';
import { TransferService } from './TransferService';
import { PurchaseOrderService } from './PurchaseOrderService';
import { SupplierService } from './SupplierService';
import { CollectionService } from './CollectionService';
import { TaxonomyService } from './TaxonomyService';
import { WishlistService } from './WishlistService';
import { AuditService } from './AuditService';
import { FulfillmentService } from './FulfillmentService';
import { OrderManagementService } from './OrderManagementService';
import { OrderQueryService } from './OrderQueryService';
import { RefundService } from './RefundService';
import { RateLimitService } from './RateLimitService';
import { OperationsRuntimeService } from './OperationsRuntimeService';
import { ConciergeService } from './ConciergeService';
import { CampaignService } from './marketing';
import { assertMultiStoreNotEnabled, SINGLE_STORE_ID } from './TenantContext';
import type {
  IProductRepository,
  ICartRepository,
  IOrderRepository,
  IDiscountRepository,
  ISettingsRepository,
  ITransferRepository,
  IPurchaseOrderRepository,
  ISupplierRepository,
  ICollectionRepository,
  IInventoryLocationRepository,
  IInventoryLevelRepository,
  ITaxonomyRepository,
  IWishlistRepository,
  ITicketRepository,
  IKnowledgebaseRepository,
  IAuthProvider,
  IRefundProcessor,
  ILockProvider,
  IShippingRepository,
  IEmailService,
  ICampaignRepository,
  ICampaignEventRepository,
  ICustomerSegmentRepository,
} from '@domain/repositories';

type IRepositories = {
  productRepo: IProductRepository;
  cartRepo: ICartRepository;
  orderRepo: IOrderRepository;
  discountRepo: IDiscountRepository;
  settingsRepo: ISettingsRepository;
  transferRepo: ITransferRepository;
  purchaseOrderRepo: IPurchaseOrderRepository;
  inventoryLocationRepo: IInventoryLocationRepository;
  inventoryLevelRepo: IInventoryLevelRepository;
  supplierRepo: ISupplierRepository;
  collectionRepo: ICollectionRepository;
  taxonomyRepo: ITaxonomyRepository;
  wishlistRepo: IWishlistRepository;
  ticketRepo: ITicketRepository;
  kbRepo: IKnowledgebaseRepository;
  shippingRepo: IShippingRepository;
  campaignRepo: ICampaignRepository;
  campaignEventRepo: ICampaignEventRepository;
  segmentRepo: ICustomerSegmentRepository;
};

// Singleton caches for production (Pattern 2 - getInitialServices)
let authServiceInstance: AuthService | null = null;
let authProviderInstance: IAuthProvider | null = null;

// Repository singletons - cached globally (shared across all services)
let productRepoInstance: IProductRepository | null = null;
let cartRepoInstance: ICartRepository | null = null;
let orderRepoInstance: IOrderRepository | null = null;
let discountRepoInstance: IDiscountRepository | null = null;
let refundProcessorInstance: IRefundProcessor | null = null;
let lockProviderInstance: ILockProvider | null = null;
let settingsRepoInstance: ISettingsRepository | null = null;
let shippingRepoInstance: IShippingRepository | null = null;
let transferRepoInstance: ITransferRepository | null = null;
let transferServiceInstance: TransferService | null = null;
let auditServiceInstance: AuditService | null = null;
let purchaseOrderRepoInstance: IPurchaseOrderRepository | null = null;
let inventoryLocationRepoInstance: IInventoryLocationRepository | null = null;
let inventoryLevelRepoInstance: IInventoryLevelRepository | null = null;
let purchaseOrderServiceInstance: PurchaseOrderService | null = null;
let supplierServiceInstance: SupplierService | null = null;
let collectionServiceInstance: CollectionService | null = null;

let taxonomyServiceInstance: TaxonomyService | null = null;
let stripeServiceInstance: StripeService | null = null;
let wishlistRepoInstance: IWishlistRepository | null = null;
let wishlistServiceInstance: WishlistService | null = null;
let ticketRepoInstance: ITicketRepository | null = null;
let kbRepoInstance: IKnowledgebaseRepository | null = null;
let shippingServiceInstance: ShippingService | null = null;
let emailServiceInstance: IEmailService | null = null;
let rateLimitServiceInstance: RateLimitService | null = null;
let conciergeServiceInstance: any | null = null;
let campaignServiceInstance: CampaignService | null = null;
let campaignRepoInstance: any | null = null;
let campaignEventRepoInstance: any | null = null;
let segmentRepoInstance: any | null = null;
let orderServiceInstance: OrderService | null = null;
let checkoutInstance: CheckoutApplicationService | null = null;
let inventoryInstance: InventoryApplicationService | null = null;
let adminInstance: AdminApplicationService | null = null;
let refundsInstance: RefundApplicationService | null = null;
let supportInstance: SupportApplicationService | null = null;
let crmInstance: CrmApplicationService | null = null;
let supportEventLogInstance: FirestoreSupportEventLog | null = null;
let checkoutEventLogInstance: FirestoreCheckoutEventLog | null = null;
let adminOperatorEventLogInstance: FirestoreAdminOperatorEventLog | null = null;
let refundEventLogInstance: FirestoreRefundEventLog | null = null;
let cartStackInstance: CartStack | null = null;
let refundServiceInstance: RefundService | null = null;
let inventoryLedgerRepoInstance: FirestoreInventoryLedgerRepository | null = null;
let inventoryReservationRepoInstance: FirestoreInventoryReservationRepository | null = null;
let inventoryReconciliationRepoInstance: FirestoreInventoryReconciliationRepository | null = null;
let commerceEventStoreInstance: FirestoreCommerceEventStore | null = null;
let commerceEventBusInstance: CommerceEventBus | null = null;
let commerceTimelineInstance: CommerceTimelineService | null = null;

function getCommerceEventBus() {
  if (!commerceEventStoreInstance) commerceEventStoreInstance = new FirestoreCommerceEventStore();
  if (!commerceEventBusInstance) commerceEventBusInstance = new CommerceEventBus(commerceEventStoreInstance);
  return commerceEventBusInstance;
}

function getCommerceTimeline() {
  if (!commerceTimelineInstance) {
    if (!commerceEventStoreInstance) getCommerceEventBus();
    commerceTimelineInstance = new CommerceTimelineService(commerceEventStoreInstance!);
  }
  return commerceTimelineInstance;
}

function createInventoryApplication(
  productRepo: IProductRepository,
  orderRepo?: IOrderRepository,
  inventoryLevelRepo?: IInventoryLevelRepository,
): InventoryApplicationService {
  if (!inventoryLedgerRepoInstance) inventoryLedgerRepoInstance = new FirestoreInventoryLedgerRepository();
  if (!inventoryReservationRepoInstance) inventoryReservationRepoInstance = new FirestoreInventoryReservationRepository();
  if (!inventoryReconciliationRepoInstance) inventoryReconciliationRepoInstance = new FirestoreInventoryReconciliationRepository();
  return createInventoryStack({
    productRepo,
    ledgerRepo: inventoryLedgerRepoInstance,
    reservationRepo: inventoryReservationRepoInstance,
    reconciliationRepo: inventoryReconciliationRepoInstance,
    inventoryLevelRepo,
    commerceEventBus: getCommerceEventBus(),
    onReservationReleased: orderRepo
      ? async ({ orderId }) => {
          const order = await orderRepo.getById(orderId);
          if (!order?.metadata?.inventoryReserved || order.metadata.inventoryReservationReleased) return;
          await orderRepo.updateMetadata(orderId, {
            ...(order.metadata || {}),
            inventoryReservationReleased: true,
            inventoryReservationReleasedAt: new Date().toISOString(),
          });
        }
      : undefined,
  }).inventory;
}

function wireCartStack(
  repos: Pick<IRepositories, 'cartRepo' | 'productRepo' | 'discountRepo' | 'orderRepo'>,
  inventory: InventoryApplicationService,
  audit: AuditService,
): CartStack {
  const discountService = new DiscountService(repos.discountRepo, audit, repos.orderRepo);
  return createCartStack({
    cartRepo: repos.cartRepo,
    productRepo: repos.productRepo,
    inventory,
    discountService,
  });
}

function wireOrderCheckoutStack(
  repos: IRepositories,
  audit: AuditService,
  locker: ILockProvider,
  stripeService: StripeService,
  inventory: InventoryApplicationService,
  cartIntent?: Pick<CartApplicationService, 'validateCart'>,
) {
  const orderService = new OrderService(
    repos.orderRepo,
    repos.productRepo,
    repos.discountRepo,
    audit,
    inventory,
    repos.shippingRepo,
    stripeService,
  );
  const eventLog = checkoutEventLogInstance ?? new FirestoreCheckoutEventLog();
  checkoutEventLogInstance = eventLog;
  const { checkout } = createCheckoutStack({
    orderRepo: repos.orderRepo,
    productRepo: repos.productRepo,
    cartRepo: repos.cartRepo,
    discountRepo: repos.discountRepo,
    audit,
    locker,
    shippingRepo: repos.shippingRepo,
    stripe: stripeService,
    eventLog,
    inventory,
    cancelExpiredPendingOrder: (orderId) => orderService.cancelExpiredPendingOrder(orderId),
    recordOperatorAction: (input) => orderService.handleReconciliationOperatorAction(input),
    commerceEventBus: getCommerceEventBus(),
    cartIntent,
  });
  return { orderService, checkout };
}

function wireSupportStack(deps: {
  ticketRepo: ITicketRepository;
  orderQueryService: OrderQueryService;
}) {
  const eventLog = supportEventLogInstance ?? new FirestoreSupportEventLog();
  supportEventLogInstance = eventLog;
  const { support } = createSupportStack({
    ticketRepo: deps.ticketRepo,
    orderQueryService: deps.orderQueryService,
    eventLog,
    commerceEventBus: getCommerceEventBus(),
  });
  return support;
}

function wireCrmStack(deps: {
  authService: AuthService;
  orderQueryService: OrderQueryService;
  ticketRepo: ITicketRepository;
}) {
  const operatorEventLog = adminOperatorEventLogInstance ?? new FirestoreAdminOperatorEventLog();
  adminOperatorEventLogInstance = operatorEventLog;
  const { crm } = createCrmStack({
    authService: deps.authService,
    orderQueryService: deps.orderQueryService,
    ticketRepo: deps.ticketRepo,
    operatorEventLog,
    commerceEventBus: getCommerceEventBus(),
  });
  return crm;
}

function wireAdminStack(deps: {
  checkout: CheckoutApplicationService;
  inventory: InventoryApplicationService;
  orderService: OrderService;
  orderQueryService: OrderQueryService;
  purchaseOrderService: PurchaseOrderService;
  authService: AuthService;
  productService: ProductService;
  inventoryLocationRepo: IInventoryLocationRepository;
  refunds: RefundApplicationService;
}) {
  const operatorEventLog = adminOperatorEventLogInstance ?? new FirestoreAdminOperatorEventLog();
  adminOperatorEventLogInstance = operatorEventLog;
  const { admin } = createAdminStack({
    ...deps,
    operatorEventLog,
    commerceEventBus: getCommerceEventBus(),
  });
  return admin;
}

function createRepositories() {
  return {
    productRepo: new FirestoreProductRepository(),
    cartRepo: new FirestoreCartRepository(),
    orderRepo: new FirestoreOrderRepository(),
    discountRepo: new FirestoreDiscountRepository(),
    settingsRepo: new FirestoreSettingsRepository(),
    transferRepo: new FirestoreTransferRepository(),
    purchaseOrderRepo: new FirestorePurchaseOrderRepository(),
    inventoryLocationRepo: new FirestoreInventoryLocationRepository(),
    inventoryLevelRepo: new FirestoreInventoryLevelRepository(),
    supplierRepo: new FirestoreSupplierRepository(),
    collectionRepo: new FirestoreCollectionRepository(),
    taxonomyRepo: new FirestoreTaxonomyRepository(),
    wishlistRepo: new FirestoreWishlistRepository(),
    ticketRepo: new FirestoreTicketRepository(),
    kbRepo: new FirestoreKnowledgebaseRepository(),
    shippingRepo: new FirestoreShippingRepository(),
    campaignRepo: new FirestoreCampaignRepository(),
    campaignEventRepo: new FirestoreCampaignEventRepository(),
    segmentRepo: new FirestoreCustomerSegmentRepository(),
  };
}


/**
 * FACTORY PATTERN: Creates fresh service instances
 */
export function getServiceContainer() {
  assertMultiStoreNotEnabled();
  const repos = createRepositories();
  const authProvider = new FirebaseAuthAdapter();
  const auditService = new AuditService();
  const authService = new AuthService(authProvider, auditService);
  const stripeService = new StripeService();
  const inventory = createInventoryApplication(repos.productRepo, repos.orderRepo, repos.inventoryLevelRepo);
  const cartStack = wireCartStack(repos, inventory, auditService);
  const { orderService, checkout } = wireOrderCheckoutStack(
    repos,
    auditService,
    new FirestoreLocker(),
    stripeService,
    inventory,
    cartStack.cart,
  );
  const productService = new ProductService(repos.productRepo, auditService, inventory);
  const orderQueryService = new OrderQueryService(repos.orderRepo, productService);
  const purchaseOrderService = new PurchaseOrderService(
    repos.purchaseOrderRepo,
    repos.productRepo,
    repos.inventoryLevelRepo,
    auditService,
    inventory,
  );
  const refundService = new RefundService(
    repos.orderRepo,
    new StripeRefundProcessor(),
    auditService,
    repos.productRepo,
    repos.discountRepo,
    new FirestoreLocker(),
    inventory,
  );
  const refundEventLog = new FirestoreRefundEventLog();
  const { refunds } = createRefundStack({
    refundService,
    orderRepo: repos.orderRepo,
    eventLog: refundEventLog,
    commerceEventBus: getCommerceEventBus(),
  });
  const admin = wireAdminStack({
    checkout,
    inventory,
    orderService,
    orderQueryService,
    purchaseOrderService,
    authService,
    productService,
    inventoryLocationRepo: repos.inventoryLocationRepo,
    refunds,
  });
  const support = wireSupportStack({ ticketRepo: repos.ticketRepo, orderQueryService });
  const crm = wireCrmStack({ authService, orderQueryService, ticketRepo: repos.ticketRepo });

  return {
    authProvider,
    authService,
    productService,
    cart: cartStack.cart,
    orderService,
    checkout,
    inventory,
    admin,
    refunds,
    support,
    crm,
    commerceEventBus: getCommerceEventBus(),
    commerceTimeline: getCommerceTimeline(),
    fulfillmentService: new FulfillmentService(repos.orderRepo, repos.shippingRepo),
    orderManagementService: new OrderManagementService(repos.orderRepo, new AuditService()),
    orderQueryService,
    refundService,
    discountService: new DiscountService(repos.discountRepo, new AuditService(), repos.orderRepo),
    settingsService: new SettingsService(repos.settingsRepo, repos.productRepo, repos.discountRepo, new AuditService()),
    shippingService: new ShippingService(repos.shippingRepo, new AuditService()),
    transferService: new TransferService(repos.transferRepo, repos.productRepo, new AuditService(), inventory),
    purchaseOrderService,
    supplierService: new SupplierService(repos.supplierRepo, new AuditService()),
    collectionService: new CollectionService(repos.collectionRepo, new AuditService()),
    taxonomyService: new TaxonomyService(repos.taxonomyRepo, new AuditService()),
    wishlistService: new WishlistService(repos.wishlistRepo, repos.productRepo, new AuditService()),
    stripeService,
    auditService: new AuditService(),
    orderRepo: repos.orderRepo,
    inventoryLocationRepo: repos.inventoryLocationRepo,
    inventoryLevelRepo: repos.inventoryLevelRepo,
    ticketRepository: repos.ticketRepo,
    knowledgebaseRepository: repos.kbRepo,
    emailService: new BrevoEmailService(new AuditService()),
    rateLimitService: new RateLimitService(new AuditService()),
    operationsRuntimeService: new OperationsRuntimeService(
      new OrderQueryService(repos.orderRepo, new ProductService(repos.productRepo, new AuditService(), inventory)),
      new ProductService(repos.productRepo, new AuditService(), inventory),
      new PurchaseOrderService(repos.purchaseOrderRepo, repos.productRepo, repos.inventoryLevelRepo, new AuditService(), inventory),
      new SettingsService(repos.settingsRepo, repos.productRepo, repos.discountRepo, new AuditService()),
      new AuditService(),
      inventory,
    ),
    campaignService: new CampaignService(
      repos.campaignRepo,
      repos.campaignEventRepo,
      repos.segmentRepo,
      new BrevoEmailService(new AuditService()),
      new AuditService(),
      repos.orderRepo,
      repos.cartRepo,
      repos.productRepo
    ),
    tenantContext: { storeId: SINGLE_STORE_ID, multiStoreEnabled: false },
  };
}


/**
 * SINGLETON PATTERN: Gets global cached services (Production Default)
 */
export function getInitialServices() {
  assertMultiStoreNotEnabled();
  const getAuditService = () => {
    if (!auditServiceInstance) auditServiceInstance = new AuditService();
    return auditServiceInstance;
  };

  if (!productRepoInstance || !cartRepoInstance || !orderRepoInstance || !discountRepoInstance || !settingsRepoInstance || !transferRepoInstance) {
    const repos = createRepositories();
    productRepoInstance = repos.productRepo;
    cartRepoInstance = repos.cartRepo;
    orderRepoInstance = repos.orderRepo;
    discountRepoInstance = repos.discountRepo;
    settingsRepoInstance = repos.settingsRepo;
    transferRepoInstance = repos.transferRepo;
    purchaseOrderRepoInstance = repos.purchaseOrderRepo;
    inventoryLocationRepoInstance = repos.inventoryLocationRepo;
    inventoryLevelRepoInstance = repos.inventoryLevelRepo;
    wishlistRepoInstance = repos.wishlistRepo;
    ticketRepoInstance = repos.ticketRepo;
    kbRepoInstance = repos.kbRepo;
    shippingRepoInstance = repos.shippingRepo;
    campaignRepoInstance = repos.campaignRepo;
    campaignEventRepoInstance = repos.campaignEventRepo;
    segmentRepoInstance = repos.segmentRepo;
  }

  if (!authProviderInstance) {
    authProviderInstance = new FirebaseAuthAdapter();
  }

  if (!authServiceInstance) {
    authServiceInstance = new AuthService(authProviderInstance!, getAuditService());
  }

  if (!refundProcessorInstance) {
    refundProcessorInstance = new StripeRefundProcessor();
  }

  if (!lockProviderInstance) {
    lockProviderInstance = new FirestoreLocker();
  }

  const getPurchaseOrderService = () => {
    if (!purchaseOrderServiceInstance) {
      purchaseOrderServiceInstance = new PurchaseOrderService(
        purchaseOrderRepoInstance!,
        productRepoInstance!,
        inventoryLevelRepoInstance!,
        getAuditService(),
        inventoryInstance!,
      );
    }
    return purchaseOrderServiceInstance;
  };

  const getRefundService = () => {
    if (!refundServiceInstance) {
      refundServiceInstance = new RefundService(
        orderRepoInstance!,
        refundProcessorInstance!,
        getAuditService(),
        productRepoInstance!,
        discountRepoInstance!,
        lockProviderInstance!,
        inventoryInstance!,
      );
    }
    return refundServiceInstance;
  };

  const getRefunds = (): RefundApplicationService => {
    if (!refundsInstance) {
      const eventLog = refundEventLogInstance ?? new FirestoreRefundEventLog();
      refundEventLogInstance = eventLog;
      refundsInstance = createRefundStack({
        refundService: getRefundService(),
        orderRepo: orderRepoInstance!,
        eventLog,
        commerceEventBus: getCommerceEventBus(),
      }).refunds;
    }
    return refundsInstance!;
  };

  const getStripeService = () => {
    if (!stripeServiceInstance) stripeServiceInstance = new StripeService();
    return stripeServiceInstance;
  };

  if (!orderServiceInstance || !checkoutInstance || !inventoryInstance || !adminInstance || !supportInstance || !crmInstance) {
    const inventory = createInventoryApplication(productRepoInstance!, orderRepoInstance!, inventoryLevelRepoInstance!);
    inventoryInstance = inventory;
    if (!cartStackInstance) {
      cartStackInstance = wireCartStack(
        {
          cartRepo: cartRepoInstance!,
          productRepo: productRepoInstance!,
          discountRepo: discountRepoInstance!,
          orderRepo: orderRepoInstance!,
        },
        inventory,
        getAuditService(),
      );
    }
    const stack = wireOrderCheckoutStack(
      {
        productRepo: productRepoInstance!,
        cartRepo: cartRepoInstance!,
        orderRepo: orderRepoInstance!,
        discountRepo: discountRepoInstance!,
        settingsRepo: settingsRepoInstance!,
        transferRepo: transferRepoInstance!,
        purchaseOrderRepo: purchaseOrderRepoInstance!,
        inventoryLocationRepo: inventoryLocationRepoInstance!,
        inventoryLevelRepo: inventoryLevelRepoInstance!,
        supplierRepo: new FirestoreSupplierRepository(),
        collectionRepo: new FirestoreCollectionRepository(),
        taxonomyRepo: new FirestoreTaxonomyRepository(),
        wishlistRepo: wishlistRepoInstance!,
        ticketRepo: ticketRepoInstance!,
        kbRepo: kbRepoInstance!,
        shippingRepo: shippingRepoInstance!,
        campaignRepo: campaignRepoInstance!,
        campaignEventRepo: campaignEventRepoInstance!,
        segmentRepo: segmentRepoInstance!,
      },
      getAuditService(),
      lockProviderInstance!,
      getStripeService(),
      inventory,
      cartStackInstance!.cart,
    );
    orderServiceInstance = stack.orderService;
    checkoutInstance = stack.checkout;

    const productService = new ProductService(productRepoInstance!, getAuditService(), inventoryInstance!);
    const orderQueryService = new OrderQueryService(orderRepoInstance!, productService);
    adminInstance = wireAdminStack({
      checkout: checkoutInstance,
      inventory: inventoryInstance,
      orderService: orderServiceInstance,
      orderQueryService,
      purchaseOrderService: getPurchaseOrderService(),
      authService: authServiceInstance!,
      productService,
      inventoryLocationRepo: inventoryLocationRepoInstance!,
      refunds: getRefunds(),
    });
    supportInstance = wireSupportStack({ ticketRepo: ticketRepoInstance!, orderQueryService });
    crmInstance = wireCrmStack({
      authService: authServiceInstance!,
      orderQueryService,
      ticketRepo: ticketRepoInstance!,
    });
  }

  if (!cartStackInstance && cartRepoInstance && productRepoInstance && discountRepoInstance && orderRepoInstance) {
    cartStackInstance = wireCartStack(
      {
        cartRepo: cartRepoInstance,
        productRepo: productRepoInstance,
        discountRepo: discountRepoInstance,
        orderRepo: orderRepoInstance,
      },
      inventoryInstance ?? createInventoryApplication(productRepoInstance, orderRepoInstance!, inventoryLevelRepoInstance!),
      getAuditService(),
    );
  }

  return {
    authProvider: authProviderInstance!,
    authService: authServiceInstance,
    productService: new ProductService(productRepoInstance!, getAuditService(), inventoryInstance!),
    cart: cartStackInstance!.cart,
    orderService: orderServiceInstance,
    checkout: checkoutInstance,
    inventory: inventoryInstance!,
    admin: adminInstance!,
    refunds: getRefunds(),
    support: supportInstance!,
    crm: crmInstance!,
    commerceEventBus: getCommerceEventBus(),
    commerceTimeline: getCommerceTimeline(),
    fulfillmentService: new FulfillmentService(orderRepoInstance!, shippingRepoInstance!),
    orderManagementService: new OrderManagementService(orderRepoInstance!, getAuditService()),
    orderQueryService: new OrderQueryService(
      orderRepoInstance!,
      new ProductService(productRepoInstance!, getAuditService(), inventoryInstance!),
    ),
    refundService: getRefundService(),
    discountService: new DiscountService(discountRepoInstance!, getAuditService(), orderRepoInstance!),
    settingsService: new SettingsService(settingsRepoInstance!, productRepoInstance!, discountRepoInstance!, getAuditService()),
    shippingService: (() => {
      if (!shippingServiceInstance) shippingServiceInstance = new ShippingService(shippingRepoInstance!, getAuditService());
      return shippingServiceInstance;
    })(),
    transferService: (() => {
      if (!transferServiceInstance) transferServiceInstance = new TransferService(transferRepoInstance!, productRepoInstance!, getAuditService(), inventoryInstance!);
      return transferServiceInstance;
    })(),
    purchaseOrderService: getPurchaseOrderService(),
    supplierService: (() => {
      if (!supplierServiceInstance) supplierServiceInstance = new SupplierService(new FirestoreSupplierRepository(), getAuditService());
      return supplierServiceInstance;
    })(),
    collectionService: (() => {
      if (!collectionServiceInstance) collectionServiceInstance = new CollectionService(new FirestoreCollectionRepository(), getAuditService());
      return collectionServiceInstance;
    })(),
    taxonomyService: (() => {
      if (!taxonomyServiceInstance) taxonomyServiceInstance = new TaxonomyService(new FirestoreTaxonomyRepository(), getAuditService());
      return taxonomyServiceInstance;
    })(),
    wishlistService: (() => {
      if (!wishlistServiceInstance) wishlistServiceInstance = new WishlistService(wishlistRepoInstance!, productRepoInstance!, getAuditService());
      return wishlistServiceInstance;
    })(),
    productRepo: productRepoInstance!,
    orderRepo: orderRepoInstance!,
    discountRepo: discountRepoInstance!,
    inventoryLocationRepo: inventoryLocationRepoInstance!,
    inventoryLevelRepo: inventoryLevelRepoInstance!,
    ticketRepository: ticketRepoInstance!,
    knowledgebaseRepository: kbRepoInstance!,
    auditService: getAuditService(),
    stripeService: getStripeService(),
    emailService: (() => {
      if (!emailServiceInstance) emailServiceInstance = new BrevoEmailService(getAuditService());
      return emailServiceInstance;
    })(),
    rateLimitService: (() => {
      if (!rateLimitServiceInstance) rateLimitServiceInstance = new RateLimitService(getAuditService());
      return rateLimitServiceInstance;
    })(),
    operationsRuntimeService: new OperationsRuntimeService(
      new OrderQueryService(orderRepoInstance!, new ProductService(productRepoInstance!, getAuditService(), inventoryInstance!)),
      new ProductService(productRepoInstance!, getAuditService(), inventoryInstance!),
      getPurchaseOrderService(),
      new SettingsService(settingsRepoInstance!, productRepoInstance!, discountRepoInstance!, getAuditService()),
      getAuditService(),
      inventoryInstance!,
    ),
    conciergeService: (() => {
      if (!conciergeServiceInstance) conciergeServiceInstance = new ConciergeService(getAuditService());
      return conciergeServiceInstance;
    })(),
    campaignService: (() => {
      if (!campaignServiceInstance) {
        campaignServiceInstance = new CampaignService(
          campaignRepoInstance!,
          campaignEventRepoInstance!,
          segmentRepoInstance!,
          emailServiceInstance || new BrevoEmailService(getAuditService()),
          getAuditService(),
          orderRepoInstance!,
          cartRepoInstance!,
          productRepoInstance!
        );
      }
      return campaignServiceInstance;
    })(),
    tenantContext: { storeId: SINGLE_STORE_ID, multiStoreEnabled: false },
  };
}
