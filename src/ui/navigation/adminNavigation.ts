/**
 * [LAYER: UI]
 * Streamlined playing-cards merchant navigation taxonomy.
 *
 * Keeps Shopify/Stripe-style labels, aliases, and primary actions in one place so
 * the sidebar, command palette, and route coverage stay aligned for managing playing card orders.
 */
import {
  BarChart3,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  Package,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  aliases: string[];
  badge?: 'orders' | 'tickets' | 'stock' | 'none';
  contextualActions?: { label: string; href: string; icon: LucideIcon }[];
  shortcut?: string;
}

export interface AdminNavGroup {
  id: string;
  label?: string;
  items: AdminNavItem[];
}

export interface AdminQuickAction {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  aliases: string[];
  group: 'Create' | 'Storefront';
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'home',
    items: [
      {
        id: 'home',
        href: '/admin',
        label: 'Home',
        description: 'Today’s priorities, sales, and order metrics',
        icon: LayoutDashboard,
        aliases: ['dashboard', 'overview', 'start', 'today'],
        shortcut: 'G H',
      },
    ],
  },

  {
    id: 'orders',
    items: [
      {
        id: 'orders',
        href: '/admin/orders',
        label: 'Orders',
        description: 'Review, fulfill, and manage card printing orders',
        icon: ClipboardList,
        aliases: ['sales', 'fulfillment', 'shipping', 'purchases', 'transactions', 'billing'],
        badge: 'orders',
        shortcut: 'G R',
      },
    ],
  },
  {
    id: 'products',
    items: [
      {
        id: 'products',
        href: '/admin/products',
        label: 'Card Variants',
        description: 'Manage playing card pricing and listings',
        icon: Package,
        aliases: ['catalog', 'items', 'listings', 'inventory', 'merchandise'],
        shortcut: 'G P',
      },
    ],
  },
  {
    id: 'customers',
    items: [
      {
        id: 'customers',
        href: '/admin/customers',
        label: 'Customers',
        description: 'Buyer profiles and custom order history',
        icon: User,
        aliases: ['buyers', 'accounts', 'people', 'users', 'support'],
      },
    ],
  },
  {
    id: 'insights',
    label: 'Intelligence',
    items: [
      {
        id: 'analytics',
        href: '/admin/analytics',
        label: 'Analytics',
        description: 'Revenue trends and card order metrics',
        icon: BarChart3,
        aliases: ['reports', 'metrics', 'revenue', 'performance', 'stripe dashboard'],
      },
    ],
  },
];

export const ADMIN_UTILITY_NAV: AdminNavItem[] = [
  {
    id: 'settings',
    href: '/admin/settings',
    label: 'Settings',
    description: 'Hardware, payments, and checkout configurations',
    icon: Settings,
    aliases: ['configuration', 'payments', 'stripe', 'checkout', 'store settings'],
  },
];

export const ADMIN_QUICK_ACTIONS: AdminQuickAction[] = [
  {
    id: 'new-product',
    href: '/admin/products/new',
    label: 'Add card variant',
    description: 'Create a new playing card variant',
    icon: Package,
    aliases: ['create listing', 'new item', 'add listing', 'upload variant'],
    group: 'Create',
  },
  {
    id: 'storefront',
    href: '/',
    label: 'View online store',
    description: 'Open the customer-facing storefront',
    icon: ExternalLink,
    aliases: ['view store', 'online store', 'website', 'sales channel'],
    group: 'Storefront',
  },
];

export const ADMIN_PRIMARY_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);
export const ADMIN_ALL_NAV_ITEMS = [...ADMIN_PRIMARY_NAV_ITEMS, ...ADMIN_UTILITY_NAV];
