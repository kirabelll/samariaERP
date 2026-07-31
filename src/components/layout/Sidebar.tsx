'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
// Using native img to avoid Next.js image optimization issues in standalone mode
import { signOut, useSession } from 'next-auth/react';
import {
  X,
  ChevronDown,
  LayoutDashboard,
  Users,
  Building2,
  Package,
  Wrench,
  Pill,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Clock,
  BarChart3,
  Settings,
  CheckSquare,
  LogOut,
  Home,
  Database,
  HardHat,
  Heart,
  Store,
  CreditCard,
  Landmark,
  UserCog,
  FileText,
  Shield,
  Truck,
  ClipboardList,
  BookOpen,
  Banknote,
  Receipt,
  CalendarDays,
  CalendarOff,
  Wallet,
  Calculator,
  BadgeDollarSign,
  FileBarChart,
  Activity,
  FolderOpen,
  Send,
  TrendingDown,
  FileCheck,
  Coins,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

type UserRole = 'ADMIN' | 'MANAGER' | 'SALES' | 'PROCUREMENT' | 'FINANCE' | 'HR' | 'WAREHOUSE' | 'MEDICAL_PHARMACIST' | 'MEDICAL_DRUGGIST';

interface NavSection {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Fallback permissions used only until API responds
const defaultRolePermissions: Record<UserRole, string[]> = {
  ADMIN: ['MAIN', 'MASTER DATA', 'CONSTRUCTION', 'MEDICAL', 'COMMERCIAL', 'PURCHASING', 'FINANCE', 'HR & PAYROLL', 'REPORTS', 'SYSTEM'],
  MANAGER: ['MAIN', 'MASTER DATA', 'CONSTRUCTION', 'MEDICAL', 'COMMERCIAL', 'PURCHASING', 'FINANCE', 'HR & PAYROLL', 'REPORTS', 'SYSTEM'],
  SALES: ['MAIN', 'MASTER DATA', 'COMMERCIAL', 'REPORTS'],
  PROCUREMENT: ['MAIN', 'MASTER DATA', 'PURCHASING', 'REPORTS'],
  FINANCE: ['MAIN', 'MASTER DATA', 'FINANCE', 'REPORTS'],
  HR: ['MAIN', 'MASTER DATA', 'HR & PAYROLL', 'REPORTS'],
  WAREHOUSE: ['MAIN', 'MASTER DATA', 'CONSTRUCTION'],
  MEDICAL_PHARMACIST: ['MAIN', 'MASTER DATA', 'MEDICAL'],
  MEDICAL_DRUGGIST: ['MAIN', 'MASTER DATA', 'MEDICAL'],
};

const navSections: NavSection[] = [
  {
    title: 'MAIN',
    icon: <Home className="w-4 h-4" />,
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    title: 'MASTER DATA',
    icon: <Database className="w-4 h-4" />,
    items: [
      { name: 'Customers', href: '/dashboard/customers', icon: <Users className="w-[18px] h-[18px]" /> },
      { name: 'Suppliers', href: '/dashboard/suppliers', icon: <Building2 className="w-[18px] h-[18px]" /> },
      { name: 'Factories', href: '/dashboard/factories', icon: <Building2 className="w-[18px] h-[18px]" /> },
      { name: 'Transport Associations', href: '/dashboard/transporters/associations', icon: <Users className="w-[18px] h-[18px]" /> },
      { name: 'Transporters', href: '/dashboard/transporters', icon: <Truck className="w-[18px] h-[18px]" /> },
      { name: 'Transport Agreements', href: '/dashboard/transporters/agreements', icon: <FileText className="w-[18px] h-[18px]" /> },
      { name: 'Items/Products', href: '/dashboard/items', icon: <Package className="w-[18px] h-[18px]" /> },
      { name: 'Employees', href: '/dashboard/employees', icon: <Users className="w-[18px] h-[18px]" /> },
      { name: 'Users & Roles', href: '/dashboard/users', icon: <UserCog className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    title: 'CONSTRUCTION',
    icon: <HardHat className="w-4 h-4" />,
    items: [
      { name: 'Aggregate Dispatch', href: '/dashboard/aggregate', icon: <Truck className="w-[18px] h-[18px]" /> },
      { name: 'Proof Register', href: '/dashboard/aggregate/proofs', icon: <FileText className="w-[18px] h-[18px]" /> },
      { name: 'Shortage Verification', href: '/dashboard/aggregate/shortage', icon: <ClipboardList className="w-[18px] h-[18px]" /> },
      { name: 'Daily Reconciliation', href: '/dashboard/aggregate/daily', icon: <CalendarDays className="w-[18px] h-[18px]" /> },
      { name: 'Aggregate Summary', href: '/dashboard/aggregate/summary', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { name: 'Cement Purchases', href: '/dashboard/cement', icon: <Building2 className="w-[18px] h-[18px]" /> },
      { name: 'Cement Liftings', href: '/dashboard/cement/lifting', icon: <Truck className="w-[18px] h-[18px]" /> },
      { name: 'Weighbridge', href: '/dashboard/cement/weighbridge', icon: <Database className="w-[18px] h-[18px]" /> },
      { name: 'Factory Balance', href: '/dashboard/cement/balance', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { name: 'Coupons', href: '/dashboard/cement/coupons', icon: <Receipt className="w-[18px] h-[18px]" /> },
      { name: 'Penalties & Recovery', href: '/dashboard/cement/penalties', icon: <DollarSign className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    title: 'MEDICAL',
    icon: <Heart className="w-4 h-4" />,
    items: [
      { name: 'Licensed Customers', href: '/dashboard/medical/customers', icon: <Pill className="w-[18px] h-[18px]" /> },
      { name: 'Purchase Requests', href: '/dashboard/medical/requests', icon: <ClipboardList className="w-[18px] h-[18px]" /> },
      { name: 'Store Management', href: '/dashboard/medical/store', icon: <Package className="w-[18px] h-[18px]" /> },
      { name: 'Pricing & Offers', href: '/dashboard/medical/pricing', icon: <BadgeDollarSign className="w-[18px] h-[18px]" /> },
      { name: 'Store Issues', href: '/dashboard/medical/store-issues', icon: <Package className="w-[18px] h-[18px]" /> },
      { name: 'Stock Adjustments', href: '/dashboard/medical/stock-adjustments', icon: <Wrench className="w-[18px] h-[18px]" /> },
      { name: 'Commission', href: '/dashboard/medical/commission/calculations', icon: <TrendingUp className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    title: 'COMMERCIAL',
    icon: <Store className="w-4 h-4" />,
    items: [
      { name: 'Customer Agreements', href: '/dashboard/sales/agreements', icon: <CheckSquare className="w-[18px] h-[18px]" /> },
      { name: 'Proformas', href: '/dashboard/sales/proformas', icon: <FileText className="w-[18px] h-[18px]" /> },
      { name: 'Sales Orders', href: '/dashboard/sales/orders', icon: <ShoppingCart className="w-[18px] h-[18px]" /> },
      { name: 'Invoices', href: '/dashboard/sales/invoices', icon: <Receipt className="w-[18px] h-[18px]" /> },
      { name: 'Deliveries', href: '/dashboard/sales/deliveries', icon: <Truck className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    title: 'PURCHASING',
    icon: <ShoppingCart className="w-4 h-4" />,
    items: [
      { name: 'Purchase Orders', href: '/dashboard/purchasing/orders', icon: <ClipboardList className="w-[18px] h-[18px]" /> },
      { name: 'Supplier Agreements', href: '/dashboard/supplier-agreements', icon: <FileText className="w-[18px] h-[18px]" /> },
      { name: 'Goods Receiving', href: '/dashboard/purchasing/grv', icon: <Package className="w-[18px] h-[18px]" /> },
      { name: 'Supplier Payments', href: '/dashboard/purchasing/payments', icon: <CreditCard className="w-[18px] h-[18px]" /> },
      { name: 'Payment Module', href: '/dashboard/purchasing/payment-module', icon: <Wallet className="w-[18px] h-[18px]" /> },
      { name: 'Transporter Recoveries', href: '/dashboard/transporters/recoveries', icon: <Wallet className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    title: 'FINANCE',
    icon: <Landmark className="w-4 h-4" />,
    items: [
      { name: 'Chart of Accounts', href: '/dashboard/finance/accounts', icon: <BookOpen className="w-[18px] h-[18px]" /> },
      { name: 'Journal Entries', href: '/dashboard/finance/journal', icon: <FileText className="w-[18px] h-[18px]" /> },
      { name: 'Bank Accounts', href: '/dashboard/finance/bank', icon: <Banknote className="w-[18px] h-[18px]" /> },
      { name: 'VAT Management', href: '/dashboard/finance/vat', icon: <Calculator className="w-[18px] h-[18px]" /> },
      { name: 'Cashbook', href: '/dashboard/finance/cashbook', icon: <Wallet className="w-[18px] h-[18px]" /> },
      { name: 'Customer Debt Summary', href: '/dashboard/finance/customer-history', icon: <TrendingDown className="w-[18px] h-[18px]" /> },
      { name: 'Cement Purchase Review', href: '/dashboard/finance/cement-purchases', icon: <FileCheck className="w-[18px] h-[18px]" /> },
      { name: 'Cement Invoices', href: '/dashboard/finance/cement-invoices', icon: <FileText className="w-[18px] h-[18px]" /> },
      { name: 'Customer Payments', href: '/dashboard/sales/payments', icon: <CreditCard className="w-[18px] h-[18px]" /> },
      { name: 'Payment Vouchers', href: '/dashboard/finance/vouchers', icon: <Receipt className="w-[18px] h-[18px]" /> },
      { name: 'Customer Deposits', href: '/dashboard/finance/deposits', icon: <Banknote className="w-[18px] h-[18px]" /> },
      { name: 'Daily Cash', href: '/dashboard/finance/daily-cash', icon: <DollarSign className="w-[18px] h-[18px]" /> },
      { name: 'Petty Cash', href: '/dashboard/finance/petty-cash', icon: <Coins className="w-[18px] h-[18px]" /> },
      { name: 'Bank Reconciliation', href: '/dashboard/finance/reconciliation', icon: <CheckSquare className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    title: 'HR & PAYROLL',
    icon: <UserCog className="w-4 h-4" />,
    items: [
      { name: 'Attendance', href: '/dashboard/hr/attendance', icon: <CalendarDays className="w-[18px] h-[18px]" /> },
      { name: 'Leave Management', href: '/dashboard/hr/leave', icon: <CalendarOff className="w-[18px] h-[18px]" /> },
      { name: 'Payroll Processing', href: '/dashboard/hr/payroll', icon: <DollarSign className="w-[18px] h-[18px]" /> },
      { name: 'Tax & Pension Setup', href: '/dashboard/hr/tax-setup', icon: <Settings className="w-[18px] h-[18px]" /> },
      { name: 'Employee Advances', href: '/dashboard/hr/advances', icon: <Wallet className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    title: 'REPORTS',
    icon: <FileBarChart className="w-4 h-4" />,
    items: [
      { name: 'Sales Reports', href: '/dashboard/reports/sales', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { name: 'Purchase Reports', href: '/dashboard/reports/purchase', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { name: 'Financial Reports', href: '/dashboard/reports/financial', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { name: 'Stock Reports', href: '/dashboard/reports/stock', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { name: 'HR Reports', href: '/dashboard/reports/hr', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      { name: 'Construction Reports', href: '/dashboard/reports/construction', icon: <HardHat className="w-[18px] h-[18px]" /> },
      { name: 'Medical Reports', href: '/dashboard/reports/medical', icon: <Heart className="w-[18px] h-[18px]" /> },
      { name: 'Exception Reports', href: '/dashboard/reports/exception', icon: <Activity className="w-[18px] h-[18px]" /> },
      { name: 'Outstanding Report', href: '/dashboard/reports/outstanding', icon: <Activity className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    title: 'SYSTEM',
    icon: <Shield className="w-4 h-4" />,
    items: [
      { name: 'Approvals', href: '/dashboard/system/approvals', icon: <CheckSquare className="w-[18px] h-[18px]" /> },
      { name: 'Activity Log', href: '/dashboard/system/activity', icon: <Activity className="w-[18px] h-[18px]" /> },
      { name: 'Documents', href: '/dashboard/system/documents', icon: <FolderOpen className="w-[18px] h-[18px]" /> },
      { name: 'Notifications', href: '/dashboard/system/notifications', icon: <Send className="w-[18px] h-[18px]" /> },
      { name: 'Exception Center', href: '/dashboard/system/exceptions', icon: <Activity className="w-[18px] h-[18px]" /> },
      { name: 'Settings', href: '/dashboard/system/settings', icon: <Settings className="w-[18px] h-[18px]" /> },
    ],
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['MAIN', 'CONSTRUCTION'])
  );
  const pathname = usePathname();
  const { data: session } = useSession();
  const { locale, setLocale } = useI18n();

  const userRole = (session?.user as any)?.role as UserRole | undefined;
  const userId = (session?.user as any)?.id as string | undefined;
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(defaultRolePermissions);
  const [userPagePermissions, setUserPagePermissions] = useState<Set<string> | null>(null);

  // Fetch role permissions and user-specific page permissions
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const res = await fetch('/api/system/role-permissions');
        const json = await res.json();
        if (json.success && json.data) {
          setRolePermissions(json.data);
        }
      } catch (error) {
        // Fall back to defaults silently
      }
    };
    loadPermissions();

    // Fetch per-user page permissions
    if (userId) {
      const loadUserPerms = async () => {
        try {
          const res = await fetch(`/api/users/${userId}/permissions`);
          const json = await res.json();
          if (json.success && json.data?.permissions?.length > 0) {
            const pages = new Set<string>(json.data.permissions.map((p: any) => p.module));
            setUserPagePermissions(pages);
          }
        } catch {
          // No per-user permissions — fall back to role-based
        }
      };
      loadUserPerms();
    }
  }, [userId]);

  const filteredSections = useMemo(() => {
    if (!userRole) return navSections;
    const allowedSections = rolePermissions[userRole];
    if (!allowedSections) return navSections;

    const isFinanceAuthorized = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'FINANCE';
    const financeOnlyItems = ['Invoices', 'Customer Payments', 'Supplier Payments'];
    const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';

    // Step 1: Role-based section filtering
    let sections = navSections.filter(section => allowedSections.includes(section.title)).map(section => {
      // Hide "Users & Roles" from non-admin/manager users
      if (section.title === 'MASTER DATA' && !isAdminOrManager) {
        return {
          ...section,
          items: section.items.filter(item => item.name !== 'Users & Roles'),
        };
      }
      // Hide Invoice & Payment pages from non-Finance roles
      if (!isFinanceAuthorized && (section.title === 'COMMERCIAL' || section.title === 'PURCHASING')) {
        return {
          ...section,
          items: section.items.filter(item => !financeOnlyItems.includes(item.name)),
        };
      }
      return section;
    });

    // Step 2: Per-user page-level filtering (skip for ADMIN/MANAGER — they always get full access)
    if (!isAdminOrManager && userPagePermissions !== null) {
      sections = sections.map(section => ({
        ...section,
        items: section.items.filter(item => userPagePermissions.has(item.name)),
      })).filter(section => section.items.length > 0);
    }

    return sections;
  }, [userRole, rolePermissions, userPagePermissions]);

  useEffect(() => {
    onClose();
  }, [pathname]);

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedSections(newExpanded);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full z-40 transition-all duration-200 flex flex-col w-[260px]
          lg:relative lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          background: 'var(--graphite-900, #1D1D1F)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          color: '#fff',
        }}
      >
        {/* Logo Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-[10px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Samaria"
              width={32}
              height={32}
              className="rounded-lg"
              style={{ filter: 'drop-shadow(0 0 8px rgba(20,246,191,0.4))' }}
            />
            <div>
              <div className="text-[15px] font-bold tracking-[0.08em]">SAMARIA</div>
              <div className="text-[9px] font-semibold tracking-[0.18em] text-[#AEAEB2] font-mono">
                ERP &middot; v1.0
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Toggle */}
        <div className="px-3 py-3 border-b border-white/10 shrink-0">
          <div className="flex gap-[2px] bg-[#2C2C2E] rounded-lg p-[3px]">
            <button
              onClick={() => setLocale('en')}
              className="flex-1 py-[6px] rounded-md text-[11px] font-medium transition-all duration-200"
              style={{
                background: locale === 'en' ? '#0B6DE5' : 'transparent',
                color: locale === 'en' ? '#fff' : '#AEAEB2',
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLocale('am')}
              className="flex-1 py-[6px] rounded-md text-[11px] font-medium transition-all duration-200"
              style={{
                background: locale === 'am' ? '#0B6DE5' : 'transparent',
                color: locale === 'am' ? '#fff' : '#AEAEB2',
              }}
            >
              አማ
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 overscroll-contain">
          {filteredSections.map((section) => (
            <div key={section.title} className="mb-[2px]">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center gap-2 px-3 py-[10px] rounded-[10px] transition-all duration-200"
                style={{
                  background: expandedSections.has(section.title) ? '#2C2C2E' : 'transparent',
                  color: expandedSections.has(section.title) ? '#fff' : '#AEAEB2',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const,
                }}
              >
                <span className="shrink-0 w-4 h-4 flex items-center">{section.icon}</span>
                <span className="flex-1 text-left">{section.title}</span>
                <ChevronDown
                  className={`w-[14px] h-[14px] shrink-0 transition-transform duration-200 ${
                    expandedSections.has(section.title) ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Section items */}
              {expandedSections.has(section.title) && (
                <div className="ml-7 border-l border-[#3A3A3C] pl-[10px] mt-1 space-y-[1px]">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-[10px] px-3 py-[9px] rounded-[10px] text-[13px] transition-all duration-200"
                        style={{
                          background: active
                            ? 'linear-gradient(135deg, #14F6BF, #0B6DE5)'
                            : 'transparent',
                          color: active ? '#fff' : '#D1D1D6',
                          fontWeight: active ? 500 : 400,
                          boxShadow: active
                            ? '0 0 0 1px rgba(20,246,191,0.4), 0 0 20px rgba(11,109,229,0.25)'
                            : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = '#2C2C2E';
                            e.currentTarget.style.color = '#fff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#D1D1D6';
                          }
                        }}
                      >
                        <span className="w-[18px] h-[18px] flex items-center">{item.icon}</span>
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User Info */}
        <div className="border-t border-white/10 p-4 space-y-3 shrink-0">
          {session?.user && (
            <div>
              <p className="text-[13px] font-medium text-white truncate">
                {session.user.name || 'User'}
              </p>
              <p className="text-[11px] text-[#AEAEB2] mt-[2px]">
                {(session.user as any).role || 'Staff'}
              </p>
            </div>
          )}
          <button
            onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
            className="flex items-center gap-[10px] w-full px-3 py-[8px] rounded-[10px] text-[13px] text-[#D1D1D6] hover:text-[#FF453A] hover:bg-[#2C2C2E] transition-all duration-200"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
