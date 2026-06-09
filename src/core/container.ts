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
import { StripePaymentProcessor } from '@infrastructure/services/StripePaymentProcessor';
import { StripeService } from '@infrastructure/services/StripeService';
import { TrustedCheckoutGateway } from '@infrastructure/checkout/TrustedCheckoutGateway';
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
import { CartService } from './CartService';
import { OrderService } from './OrderService';
import { createCheckoutStack } from './order/createCheckoutStack';
import type { CheckoutApplicationService } from './order/checkoutApplicationService';
import { createInventoryStack } from './inventory/createInventoryStack';
import type { InventoryApplicationService } from './inventory/inventoryApplicationService';
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
  IPaymentProcessor,
  ILockProvider,
  ICheckoutGateway,
  IShippingRepository,
  IEmailService,
} from '@domain/repositories';

// Singleton caches for production (Pattern 2 - getInitialServices)
let authServiceInstance: AuthService | null = null;
let authProviderInstance: IAuthProvider | null = null;

// Repository singletons - cached globally (shared across all services)
let productRepoInstance: IProductRepository | null = null;
let cartRepoInstance: ICartRepository | null = null;
let orderRepoInstance: IOrderRepository | null = null;
let discountRepoInstance: IDiscountRepository | null = null;
let paymentProcessorInstance: IPaymentProcessor | null = null;
let lockProviderInstance: ILockProvider | null = null;
let checkoutGatewayInstance: ICheckoutGateway | null = null;
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
let checkoutEventLogInstance: FirestoreCheckoutEventLog | null = null;
let inventoryLedgerRepoInstance: FirestoreInventoryLedgerRepository | null = null;
let inventoryReservationRepoInstance: FirestoreInventoryReservationRepository | null = null;
let inventoryReconciliationRepoInstance: FirestoreInventoryReconciliationRepository | null = null;

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

function createCheckoutGateway(): ICheckoutGateway | undefined {
  return process.env.CHECKOUT_ENDPOINT ? new TrustedCheckoutGateway() : undefined;
}

function wireOrderCheckoutStack(
  repos: ReturnType<typeof createRepositories>,
  payment: IPaymentProcessor,
  audit: AuditService,
  locker: ILockProvider,
  stripeService: StripeService,
  inventory: InventoryApplicationService,
  checkoutGateway?: ICheckoutGateway,
) {
  const orderService = new OrderService(
    repos.orderRepo,
    repos.productRepo,
    repos.discountRepo,
    audit,
    repos.shippingRepo,
    stripeService,
    inventory,
  );
  const eventLog = checkoutEventLogInstance ?? new FirestoreCheckoutEventLog();
  checkoutEventLogInstance = eventLog;
  const { checkout } = createCheckoutStack({
    orderRepo: repos.orderRepo,
    productRepo: repos.productRepo,
    cartRepo: repos.cartRepo,
    discountRepo: repos.discountRepo,
    payment,
    audit,
    locker,
    shippingRepo: repos.shippingRepo,
    checkoutGateway,
    stripe: stripeService,
    eventLog,
    inventory,
    cancelExpiredPendingOrder: (orderId) => orderService.cancelExpiredPendingOrder(orderId),
    recordOperatorAction: (input) => orderService.handleReconciliationOperatorAction(input),
  });
  return { orderService, checkout };
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
  const { orderService, checkout } = wireOrderCheckoutStack(
    repos,
    new StripePaymentProcessor(),
    auditService,
    new FirestoreLocker(),
    stripeService,
    inventory,
    createCheckoutGateway(),
  );

  return {
    authProvider,
    authService,
    productService: new ProductService(repos.productRepo, auditService, inventory),
    cartService: new CartService(repos.cartRepo, repos.productRepo, inventory),
    orderService,
    checkout,
    inventory,
    fulfillmentService: new FulfillmentService(repos.orderRepo, repos.shippingRepo),
    orderManagementService: new OrderManagementService(repos.orderRepo, new AuditService()),
    orderQueryService: new OrderQueryService(repos.orderRepo, new ProductService(repos.productRepo, new AuditService(), inventory)),
    refundService: new RefundService(repos.orderRepo, new StripePaymentProcessor(), new AuditService(), repos.productRepo, repos.discountRepo, new FirestoreLocker(), inventory),
    discountService: new DiscountService(repos.discountRepo, new AuditService(), repos.orderRepo),
    settingsService: new SettingsService(repos.settingsRepo, repos.productRepo, repos.discountRepo, new AuditService()),
    shippingService: new ShippingService(repos.shippingRepo, new AuditService()),
    transferService: new TransferService(repos.transferRepo, repos.productRepo, new AuditService(), inventory),
    purchaseOrderService: new PurchaseOrderService(repos.purchaseOrderRepo, repos.productRepo, repos.inventoryLevelRepo, new AuditService(), inventory),
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

  if (!paymentProcessorInstance) {
    paymentProcessorInstance = new StripePaymentProcessor();
  }

  if (!lockProviderInstance) {
    lockProviderInstance = new FirestoreLocker();
  }

  if (!checkoutGatewayInstance && process.env.CHECKOUT_ENDPOINT) {
    checkoutGatewayInstance = new TrustedCheckoutGateway();
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

  const getStripeService = () => {
    if (!stripeServiceInstance) stripeServiceInstance = new StripeService();
    return stripeServiceInstance;
  };

  if (!orderServiceInstance || !checkoutInstance || !inventoryInstance) {
    const inventory = createInventoryApplication(productRepoInstance!, orderRepoInstance!, inventoryLevelRepoInstance!);
    inventoryInstance = inventory;
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
      paymentProcessorInstance!,
      getAuditService(),
      lockProviderInstance!,
      getStripeService(),
      inventory,
      checkoutGatewayInstance ?? undefined,
    );
    orderServiceInstance = stack.orderService;
    checkoutInstance = stack.checkout;
  }

  return {
    authProvider: authProviderInstance!,
    authService: authServiceInstance,
    productService: new ProductService(productRepoInstance!, getAuditService(), inventoryInstance!),
    cartService: new CartService(cartRepoInstance!, productRepoInstance!, inventoryInstance!),
    orderService: orderServiceInstance,
    checkout: checkoutInstance,
    inventory: inventoryInstance!,
    fulfillmentService: new FulfillmentService(orderRepoInstance!, shippingRepoInstance!),
    orderManagementService: new OrderManagementService(orderRepoInstance!, getAuditService()),
    orderQueryService: new OrderQueryService(orderRepoInstance!, new ProductService(productRepoInstance!, getAuditService())),
    refundService: new RefundService(orderRepoInstance!, paymentProcessorInstance!, getAuditService(), productRepoInstance!, discountRepoInstance!, lockProviderInstance!, inventoryInstance!),
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
    cartRepo: cartRepoInstance!,
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
