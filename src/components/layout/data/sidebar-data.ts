import {
  IconLayoutDashboard,
  IconUsers,
  IconBuildingStore,
  IconBuildingFactory2,
  IconTruckDelivery,
  IconPackages,
  IconUserCheck,
  IconUserShield,
  IconReceipt2,
  IconScale,
  IconPill,
  IconMedicineSyrup,
  IconShoppingCart,
  IconClipboardCheck,
  IconFileInvoice,
  IconFileSpreadsheet,
  IconCash,
  IconCoins,
  IconCalendarEvent,
  IconFileAnalytics,
  IconSettings,
  IconShieldCheck,
  IconHistory,
  IconFolder,
  IconBell,
  IconAlertTriangle,
  IconBuildingSkyscraper,
} from '@tabler/icons-react';
import { Building2, Command, Layers } from 'lucide-react';
import { type SidebarData } from '../types';

export const sidebarData: SidebarData = {
  user: {
    name: 'Administrator',
    email: 'admin@samaria.com',
    avatar: '',
    role: 'ADMIN',
  },
  teams: [
    {
      name: 'Samaria Trading PLC',
      logo: Building2,
      plan: 'Enterprise ERP System',
    },
    {
      name: 'Construction Division',
      logo: Layers,
      plan: 'Aggregate & Cement',
    },
    {
      name: 'Pharmaceutical Division',
      logo: Command,
      plan: 'Medical & Healthcare',
    },
  ],
  navGroups: [
    {
      title: 'Main',
      items: [
        {
          title: 'Dashboard',
          icon: IconLayoutDashboard,
          items: [
            {
              title: 'Executive Overview',
              url: '/dashboard',
              icon: IconLayoutDashboard,
            },
            {
              title: 'Financial Dashboard',
              url: '/dashboard/finance',
              icon: IconCash,
            },
            {
              title: 'Construction Dashboard',
              url: '/dashboard/construction',
              icon: IconBuildingSkyscraper,
            },
            {
              title: 'Medical & Pharma',
              url: '/dashboard/medical',
              icon: IconPill,
            },
            {
              title: 'Sales Dashboard',
              url: '/dashboard/sales',
              icon: IconShoppingCart,
            },
            {
              title: 'Purchasing Dashboard',
              url: '/dashboard/purchasing',
              icon: IconClipboardCheck,
            },
            {
              title: 'Transport Dashboard',
              url: '/dashboard/transport',
              icon: IconTruckDelivery,
            },
            {
              title: 'Stock Dashboard',
              url: '/dashboard/stock',
              icon: IconPackages,
            },
          ],
        },
      ],
    },
    {
      title: 'Master Data',
      items: [
        {
          title: 'Customers',
          url: '/dashboard/customers',
          icon: IconUsers,
        },
        {
          title: 'Suppliers',
          url: '/dashboard/suppliers',
          icon: IconBuildingStore,
        },
        {
          title: 'Factories',
          url: '/dashboard/factories',
          icon: IconBuildingFactory2,
        },
        {
          title: 'Transporters',
          icon: IconTruckDelivery,
          items: [
            {
              title: 'Fleet & Transporters',
              url: '/dashboard/transporters',
              icon: IconTruckDelivery,
            },
            {
              title: 'Transport Associations',
              url: '/dashboard/transporters/associations',
              icon: IconUsers,
            },
            {
              title: 'Transport Agreements',
              url: '/dashboard/transporters/agreements',
              icon: IconFileSpreadsheet,
            },
          ],
        },
        {
          title: 'Items & Products',
          url: '/dashboard/items',
          icon: IconPackages,
        },
        {
          title: 'Employees',
          url: '/dashboard/employees',
          icon: IconUserCheck,
        },
        {
          title: 'Users & Roles',
          url: '/dashboard/users',
          icon: IconUserShield,
        },
      ],
    },
    {
      title: 'Construction',
      items: [
        {
          title: 'Aggregate',
          icon: IconBuildingSkyscraper,
          items: [
            {
              title: 'Aggregate Dispatch',
              url: '/dashboard/aggregate',
            },
            {
              title: 'Proof Register',
              url: '/dashboard/aggregate/proofs',
            },
            {
              title: 'Shortage Verification',
              url: '/dashboard/aggregate/shortage',
            },
            {
              title: 'Daily Reconciliation',
              url: '/dashboard/aggregate/daily',
            },
            {
              title: 'Aggregate Summary',
              url: '/dashboard/aggregate/summary',
            },
          ],
        },
        {
          title: 'Cement Operations',
          icon: IconScale,
          items: [
            {
              title: 'Cement Purchases',
              url: '/dashboard/cement',
            },
            {
              title: 'Cement Liftings',
              url: '/dashboard/cement/lifting',
            },
            {
              title: 'Weighbridge Registry',
              url: '/dashboard/cement/weighbridge',
            },
            {
              title: 'Factory Balance',
              url: '/dashboard/cement/balance',
            },
            {
              title: 'Coupons Management',
              url: '/dashboard/cement/coupons',
            },
            {
              title: 'Penalties & Recovery',
              url: '/dashboard/cement/penalties',
            },
          ],
        },
      ],
    },
    {
      title: 'Medical & Pharma',
      items: [
        {
          title: 'Pharmacy Operations',
          icon: IconPill,
          items: [
            {
              title: 'Licensed Customers',
              url: '/dashboard/medical/customers',
            },
            {
              title: 'Purchase Order',
              url: '/dashboard/medical/requests',
            },
            {
              title: 'Store Management',
              url: '/dashboard/medical/store',
            },
            {
              title: 'Pricing & Offers',
              url: '/dashboard/medical/pricing',
            },
            {
              title: 'Store Issues',
              url: '/dashboard/medical/store-issues',
            },
            {
              title: 'Stock Adjustments',
              url: '/dashboard/medical/stock-adjustments',
            },
            {
              title: 'Pharmacist Commission',
              url: '/dashboard/medical/commission/calculations',
            },
          ],
        },
      ],
    },
    {
      title: 'Commercial & Sales',
      items: [
        {
          title: 'Sales Management',
          icon: IconShoppingCart,
          items: [
            {
              title: 'Customer Agreements',
              url: '/dashboard/sales/agreements',
            },
            {
              title: 'Proformas',
              url: '/dashboard/sales/proformas',
            },
            {
              title: 'Sales Orders',
              url: '/dashboard/sales/orders',
            },
            {
              title: 'Sales Invoices',
              url: '/dashboard/sales/invoices',
            },
            {
              title: 'Deliveries',
              url: '/dashboard/sales/deliveries',
            },
          ],
        },
      ],
    },
    {
      title: 'Purchasing',
      items: [
        {
          title: 'Procurement',
          icon: IconClipboardCheck,
          items: [
            {
              title: 'Purchase Orders',
              url: '/dashboard/purchasing/orders',
            },
            {
              title: 'Supplier Agreements',
              url: '/dashboard/supplier-agreements',
            },
            {
              title: 'Goods Receiving (GRV)',
              url: '/dashboard/purchasing/grv',
            },
            {
              title: 'Supplier Payments',
              url: '/dashboard/purchasing/payments',
            },
            {
              title: 'Payment Module',
              url: '/dashboard/purchasing/payment-module',
            },
            {
              title: 'Transporter Recoveries',
              url: '/dashboard/transporters/recoveries',
            },
          ],
        },
      ],
    },
    {
      title: 'Finance & Accounts',
      items: [
        {
          title: 'Financial Accounting',
          icon: IconCash,
          items: [
            {
              title: 'Chart of Accounts',
              url: '/dashboard/finance/accounts',
            },
            {
              title: 'General Ledger',
              url: '/dashboard/finance/general-ledger',
            },
            {
              title: 'Journal Entries',
              url: '/dashboard/finance/journal',
            },
            {
              title: 'Bank Accounts',
              url: '/dashboard/finance/bank',
            },
            {
              title: 'VAT Management',
              url: '/dashboard/finance/vat',
            },
            {
              title: 'Cashbook',
              url: '/dashboard/finance/cashbook',
            },
            {
              title: 'Customer Debt History',
              url: '/dashboard/finance/customer-history',
            },
            {
              title: 'Customer Payments',
              url: '/dashboard/sales/payments',
            },
            {
              title: 'Payment Vouchers',
              url: '/dashboard/finance/vouchers',
            },
            {
              title: 'Customer Deposits',
              url: '/dashboard/finance/deposits',
            },
            {
              title: 'Daily Cash Management',
              url: '/dashboard/finance/daily-cash',
            },
            {
              title: 'Petty Cash',
              url: '/dashboard/finance/petty-cash',
            },
            {
              title: 'Bank Reconciliation',
              url: '/dashboard/finance/reconciliation',
            },
          ],
        },
      ],
    },
    {
      title: 'HR & Payroll',
      items: [
        {
          title: 'Human Resources',
          icon: IconUserCheck,
          items: [
            {
              title: 'Employee Attendance',
              url: '/dashboard/hr/attendance',
            },
            {
              title: 'Leave Management',
              url: '/dashboard/hr/leave',
            },
            {
              title: 'Payroll Processing',
              url: '/dashboard/hr/payroll',
            },
            {
              title: 'Tax & Pension Setup',
              url: '/dashboard/hr/tax-setup',
            },
            {
              title: 'Employee Advances',
              url: '/dashboard/hr/advances',
            },
          ],
        },
      ],
    },
    {
      title: 'Reports & Intelligence',
      items: [
        {
          title: 'Analytics & Reports',
          icon: IconFileAnalytics,
          items: [
            {
              title: 'Sales Reports',
              url: '/dashboard/reports/sales',
            },
            {
              title: 'Purchase Reports',
              url: '/dashboard/reports/purchase',
            },
            {
              title: 'Financial Reports',
              url: '/dashboard/reports/financial',
            },
            {
              title: 'Stock & Inventory',
              url: '/dashboard/reports/stock',
            },
            {
              title: 'HR & Payroll Reports',
              url: '/dashboard/reports/hr',
            },
            {
              title: 'Construction Reports',
              url: '/dashboard/reports/construction',
            },
            {
              title: 'Medical Reports',
              url: '/dashboard/reports/medical',
            },
            {
              title: 'Exception Reports',
              url: '/dashboard/reports/exception',
            },
            {
              title: 'Outstanding Balances',
              url: '/dashboard/reports/outstanding',
            },
          ],
        },
      ],
    },
    {
      title: 'System Administration',
      items: [
        {
          title: 'Administration',
          icon: IconSettings,
          items: [
            {
              title: 'Approvals Center',
              url: '/dashboard/system/approvals',
            },
            {
              title: 'Audit Activity Log',
              url: '/dashboard/system/activity',
            },
            {
              title: 'Documents & Attachments',
              url: '/dashboard/system/documents',
            },
            {
              title: 'System Notifications',
              url: '/dashboard/system/notifications',
            },
            {
              title: 'Exception Center',
              url: '/dashboard/system/exceptions',
            },
            {
              title: 'Configuration Settings',
              url: '/dashboard/system/settings',
            },
          ],
        },
      ],
    },
  ],
};
