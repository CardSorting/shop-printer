/**
 * [LAYER: UI]
 * Purchase Orders — merchant-friendly inbound inventory and receiving workspace
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  DollarSign,
  Package,
  Plus,
  Search,
  Truck,
  XCircle,
  type LucideIcon,
  ChevronRight,
  MoreHorizontal,
  LayoutGrid
} from 'lucide-react';
import { useServices } from '../../hooks/useServices';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  centsToDecimalInput,
  formatCurrency,
  normalizeSearch,
  parseCurrencyToCents,
  formatShortDate,
} from '@utils/formatters';
import { purchaseOrderRules } from '@domain/rules';
import {
  AdminPageHeader,
  AdminMetricCard,
  AdminEmptyState,
  SkeletonPage,
  useToast,
  useAdminPageTitle,
  AdminStatusBadge,
  AdminConfirmDialog,
} from '../../components/admin/AdminComponents';
import { AdminTimeline, type TimelineEvent } from '../../components/admin/AdminTimeline';

import type {
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderLineReceivingSummary,
  PurchaseOrderReceivingSummary,
  PurchaseOrderSavedView,
  PurchaseOrderWorkflowStep,
  ReceivingDiscrepancyReason,
  ReceivingLineDisposition,
} from '@domain/models';

type Services = ReturnType<typeof useServices>;
type StatusFilter = PurchaseOrderSavedView;
type ReceiveCondition = 'new' | 'damaged' | 'defective';

interface WorkspaceOrder {
  order: PurchaseOrder;
  summary: PurchaseOrderReceivingSummary;
  workflow: PurchaseOrderWorkflowStep[];
  lineSummaries: PurchaseOrderLineReceivingSummary[];
  attentionRequired: boolean;
}

interface PurchaseOrderWorkspace {
  countsByView: Record<PurchaseOrderSavedView, number>;
  metrics?: {
    incomingUnits: number;
    openShipments: number;
    exceptionCount: number;
    overdueCount: number;
    receivingValue: number;
  };
  orders: WorkspaceOrder[];
}

const SAVED_VIEWS: Array<{ value: StatusFilter; label: string; description: string; icon: LucideIcon }> = [
  { value: 'all', label: 'All', description: 'Every supplier order', icon: ClipboardList },
  { value: 'drafts', label: 'Draft', description: 'Not sent yet', icon: Clock },
  { value: 'incoming', label: 'Incoming', description: 'Ordered from suppliers', icon: Truck },
  { value: 'partially_received', label: 'Partial', description: 'Some stock arrived', icon: Package },
  { value: 'exceptions', label: 'Exceptions', description: 'Needs reconciliation', icon: AlertTriangle },
  { value: 'ready_to_close', label: 'Ready to close', description: 'Fully received', icon: CheckCircle2 },
  { value: 'closed', label: 'Closed', description: 'Completed records', icon: ClipboardCheck },
];

function emptyCounts(): Record<PurchaseOrderSavedView, number> {
  return {
    all: 0,
    drafts: 0,
    incoming: 0,
    partially_received: 0,
    ready_to_close: 0,
    exceptions: 0,
    closed: 0,
  };
}

function buildWorkspaceFromOrders(orders: PurchaseOrder[]): PurchaseOrderWorkspace {
  const workspaceOrders = orders.map((order) => {
    const lineSummaries = purchaseOrderRules.calculateLineReceivingSummaries(order);
    return {
      order,
      summary: purchaseOrderRules.calculateReceivingSummary(order),
      workflow: purchaseOrderRules.buildWorkflowSteps(order),
      lineSummaries,
      attentionRequired: lineSummaries.some((line) => line.attentionRequired),
    };
  });
  const countsByView = SAVED_VIEWS.reduce((acc, view) => {
    acc[view.value] = orders.filter((order) => purchaseOrderRules.matchesSavedView(order, view.value)).length;
    return acc;
  }, emptyCounts());
  const metrics = workspaceOrders.reduce((acc, workspaceOrder) => {
    if (purchaseOrderRules.canReceive(workspaceOrder.order)) {
      acc.openShipments += 1;
      acc.incomingUnits += workspaceOrder.summary.openQty;
      acc.receivingValue += workspaceOrder.order.items.reduce((sum, item) => sum + Math.max(0, item.orderedQty - item.receivedQty) * item.unitCost, 0);
    }
    if (workspaceOrder.attentionRequired) acc.exceptionCount += 1;
    if (workspaceOrder.summary.dueState === 'overdue') acc.overdueCount += 1;
    return acc;
  }, { incomingUnits: 0, openShipments: 0, exceptionCount: 0, overdueCount: 0, receivingValue: 0 });
  return { countsByView, metrics, orders: workspaceOrders };
}

export function AdminPurchaseOrders() {
  useAdminPageTitle('Receiving');
  const services = useServices();
  const router = useRouter();
  const { toast } = useToast();

  const [workspace, setWorkspace] = useState<PurchaseOrderWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('incoming');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<WorkspaceOrder | null>(null);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const nextWorkspace = await services.purchaseOrderService.getWorkspace?.();
      setWorkspace(nextWorkspace ?? buildWorkspaceFromOrders(await services.purchaseOrderService.list({ limit: 100 })));
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to load receiving workspace');
    } finally {
      setLoading(false);
    }
  }, [services, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    const needle = normalizeSearch(query);
    return (workspace?.orders ?? []).filter(({ order }) => {
      const matchesView = purchaseOrderRules.matchesSavedView(order, statusFilter);
      const matchesSearch =
        !needle ||
        [order.supplier, order.referenceNumber ?? '', order.id, ...order.items.flatMap((item) => [item.productName, item.sku])]
          .some((value) => normalizeSearch(value).includes(needle));
      return matchesView && matchesSearch;
    });
  }, [workspace, statusFilter, query]);

  const handleCancel = async (id: string) => {
    try {
      await services.purchaseOrderService.cancel(id);
      toast('success', 'Order cancelled');
      void loadData();
      setDetail(null);
      setPendingCancelId(null);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Cancel failed');
    }
  };

  const handleReceive = (workspaceOrder: WorkspaceOrder) => {
    router.push(`/admin/purchase-orders/${workspaceOrder.order.id}/receive`);
  };

  if (loading && !workspace) return <SkeletonPage />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <AdminPageHeader
        category="Inventory intake"
        title="Receiving"
        subtitle="Order stock, receive shipments, and resolve supplier exceptions with a guided merchant workflow."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/products/new"
              className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
            >
              <Package className="h-4 w-4" /> Add product first
            </Link>
            <Link 
              href="/admin/purchase-orders/new"
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-primary-500/20 transition hover:bg-primary-700 active:scale-95"
            >
              <Plus className="h-4 w-4" /> Order stock
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Open shipments"
          value={workspace?.metrics?.openShipments ?? 0}
          description="Supplier orders waiting to be received."
          icon={Truck}
          color="primary"
        />
        <AdminMetricCard
          label="Incoming units"
          value={workspace?.metrics?.incomingUnits ?? 0}
          description="Units still expected from active POs."
          icon={Boxes}
          color="info"
        />
        <AdminMetricCard
          label="Exceptions"
          value={workspace?.metrics?.exceptionCount ?? 0}
          description="Short, over, or damaged lines that need review."
          icon={AlertTriangle}
          color={(workspace?.metrics?.exceptionCount ?? 0) > 0 ? 'danger' : 'success'}
        />
        <AdminMetricCard
          label="Open value"
          value={formatCurrency(workspace?.metrics?.receivingValue ?? 0)}
          description={`${workspace?.metrics?.overdueCount ?? 0} overdue shipment${(workspace?.metrics?.overdueCount ?? 0) === 1 ? '' : 's'}.`}
          icon={DollarSign}
          color={(workspace?.metrics?.overdueCount ?? 0) > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-600">Recommended intake path</p>
            <h2 className="mt-1 text-sm font-bold text-gray-900">Add product → Order stock → Receive shipment → Resolve exceptions → Sell</h2>
            <p className="mt-1 text-xs text-gray-500">This mirrors the Shopify merchant pattern: products and suppliers first, then purchase orders and receiving sessions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/suppliers" className="rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50">Suppliers</Link>
            <Link href="/admin/inventory" className="rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50">Inventory</Link>
            <Link href="/admin/products" className="rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50">Products</Link>
          </div>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {SAVED_VIEWS.map((view) => (
          <button
            key={view.value}
            onClick={() => setStatusFilter(view.value)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              statusFilter === view.value
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border'
            }`}
          >
            <view.icon className="h-4 w-4" />
            {view.label}
            <span className={`ml-1 rounded-md px-1.5 py-0.5 text-[10px] ${statusFilter === view.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {workspace?.countsByView[view.value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by supplier or PO #..."
              className="w-full rounded-xl border bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredOrders.map((wsOrder) => (
            <div key={wsOrder.order.id} className="group flex items-center justify-between p-4 transition hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${wsOrder.attentionRequired ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600'}`}>
                  {wsOrder.attentionRequired ? <AlertTriangle className="h-6 w-6" /> : <Package className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{wsOrder.order.supplier}</h3>
                  <div className="mt-1 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <span>PO {wsOrder.order.id.slice(0, 8)}</span>
                    <span>{wsOrder.order.referenceNumber || 'No Ref'}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatShortDate(wsOrder.order.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-bold text-gray-900">{wsOrder.summary.receivedQty} / {wsOrder.summary.orderedQty} received</p>
                  <div className="mt-1 h-1 w-24 rounded-full bg-gray-100">
                    <div 
                      className="h-full rounded-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${(wsOrder.summary.receivedQty / wsOrder.summary.orderedQty) * 100}%` }} 
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDetail(wsOrder)} className="rounded-lg border bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:bg-gray-50 shadow-sm transition">Review</button>
                  {purchaseOrderRules.canReceive(wsOrder.order) && (
                    <button 
                      onClick={() => handleReceive(wsOrder)}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700 active:scale-95"
                    >
                      <Truck className="h-4 w-4" /> Receive
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredOrders.length === 0 && !loading && (
            <AdminEmptyState
              title="No purchase orders found"
              description="Create a purchase order to start tracking inbound inventory from your suppliers."
              icon={Package}
              action={
                <Link 
                  href="/admin/purchase-orders/new"
                  className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary-500/20 transition hover:bg-primary-700 active:scale-95"
                >
                  <Plus className="h-4 w-4" /> Create purchase order
                </Link>
              }
            />
          )}
        </div>
      </div>

      {detail && (
        <DetailDrawer
          workspaceOrder={detail}
          onClose={() => setDetail(null)}
          onReceive={() => handleReceive(detail)}
          onCancel={() => setPendingCancelId(detail.order.id)}
        />
      )}

      <AdminConfirmDialog
        open={Boolean(pendingCancelId)}
        onClose={() => setPendingCancelId(null)}
        onConfirm={() => pendingCancelId && void handleCancel(pendingCancelId)}
        title="Cancel purchase order?"
        description="This will move the purchase order out of active receiving. Existing product and inventory records will not be changed."
        confirmLabel="Cancel order"
      />
    </div>
  );
}

function ReceivingStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-xs">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}

function DetailDrawer({ workspaceOrder, onClose, onReceive, onCancel }: { workspaceOrder: WorkspaceOrder; onClose: () => void; onReceive: () => void; onCancel: () => void }) {
  const { order, summary, workflow, lineSummaries } = workspaceOrder;
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');
  const services = useServices();
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  const fetchTimeline = useCallback(async () => {
    if (!order) return;
    setIsTimelineLoading(true);
    try {
      const logs = await services.auditService.getRecentLogs({ targetId: order.id });
      setTimelineEvents(logs.map((log: any) => ({
        id: log.id,
        type: log.action.includes('received') ? 'receiving' : log.action.includes('created') ? 'creation' : 'status_change',
        title: log.action.split('.').pop()?.replace(/_/g, ' ') || log.action,
        timestamp: log.createdAt,
        actor: log.userEmail,
        description: log.details ? JSON.stringify(log.details) : undefined
      })));
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    } finally {
      setIsTimelineLoading(false);
    }
  }, [order, services]);

  useEffect(() => {
    if (activeTab === 'timeline') {
      void fetchTimeline();
    }
  }, [activeTab, fetchTimeline]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{order.supplier}</h2>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">PO #{order.id.slice(0, 8)}</span>
                <AdminStatusBadge status={order.status} type="transfer" />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl border p-2 text-gray-400 hover:text-gray-600 transition active:scale-95 shadow-sm">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b px-8">
          <button onClick={() => setActiveTab('details')} className={`border-b-2 px-4 py-4 text-xs font-bold uppercase tracking-widest transition ${activeTab === 'details' ? 'border-primary-600 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Details</button>
          <button onClick={() => setActiveTab('timeline')} className={`border-b-2 px-4 py-4 text-xs font-bold uppercase tracking-widest transition ${activeTab === 'timeline' ? 'border-primary-600 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Timeline</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          {activeTab === 'details' ? (
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-3">
                <ReceivingStat label="Ordered" value={summary.orderedQty} />
                <ReceivingStat label="Received" value={summary.receivedQty} />
                <ReceivingStat label="Open" value={summary.openQty} />
              </div>

              <section>
                <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Items</h3>
                <div className="divide-y rounded-2xl border">
                  {lineSummaries.map((line) => (
                    <div key={line.sku} className="flex items-center justify-between p-4 transition hover:bg-gray-50">
                      <div>
                        <p className="text-xs font-bold text-gray-900">{line.productName}</p>
                        <p className="mt-0.5 text-[9px] font-medium text-gray-500 uppercase tracking-widest">SKU: {line.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-900">{line.receivedQty} / {line.orderedQty}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${line.progressPercent === 100 ? 'text-green-600' : 'text-primary-600'}`}>
                          {line.progressPercent === 100 ? 'Received' : line.varianceType === 'none' ? 'Pending' : line.varianceType.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {order.notes && (
                <section>
                  <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Internal Notes</h3>
                  <div className="rounded-2xl bg-gray-50 p-4 text-xs italic text-gray-600 leading-relaxed ring-1 ring-gray-100">
                    "{order.notes}"
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="space-y-6">
               <AdminTimeline events={timelineEvents} />
            </div>
          )}
        </div>

        <div className="border-t bg-gray-50 p-8 flex items-center justify-between">
          <button onClick={onCancel} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition shadow-sm">
            Cancel Order
          </button>
          {purchaseOrderRules.canReceive(order) && (
            <button 
              onClick={onReceive}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary-500/20 transition hover:bg-primary-700 active:scale-95"
            >
              <Truck className="h-4 w-4" /> Receive Items
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
