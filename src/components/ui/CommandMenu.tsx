'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Search,
  LayoutDashboard,
  Users,
  Building2,
  Package,
  Wrench,
  Pill,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Shield,
  Truck,
  Sun,
  Moon,
  Laptop,
  ArrowRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandItemData {
  title: string;
  href: string;
  group: string;
  icon?: React.ReactNode;
  keywords?: string[];
}

const erpRoutes: CommandItemData[] = [
  // Master Data
  { title: 'Dashboard', href: '/dashboard', group: 'Main', icon: <LayoutDashboard className="w-4 h-4" /> },
  { title: 'Customers', href: '/dashboard/customers', group: 'Master Data', icon: <Users className="w-4 h-4" /> },
  { title: 'Suppliers', href: '/dashboard/suppliers', group: 'Master Data', icon: <Building2 className="w-4 h-4" /> },
  { title: 'Items & Products', href: '/dashboard/items', group: 'Master Data', icon: <Package className="w-4 h-4" /> },
  { title: 'Factories', href: '/dashboard/factories', group: 'Master Data', icon: <Building2 className="w-4 h-4" /> },
  { title: 'Transporters', href: '/dashboard/transporters', group: 'Master Data', icon: <Truck className="w-4 h-4" /> },

  // Construction
  { title: 'Aggregate Operations', href: '/dashboard/aggregate', group: 'Construction', icon: <Wrench className="w-4 h-4" /> },
  { title: 'Cement Distribution', href: '/dashboard/cement', group: 'Construction', icon: <Building2 className="w-4 h-4" /> },

  // Medical
  { title: 'Medical Pharmacy', href: '/dashboard/medical', group: 'Medical', icon: <Pill className="w-4 h-4" /> },

  // Commercial & Purchasing
  { title: 'Sales Orders', href: '/dashboard/sales/orders', group: 'Commercial', icon: <ShoppingCart className="w-4 h-4" /> },
  { title: 'Sales Invoices', href: '/dashboard/sales/invoices', group: 'Commercial', icon: <ShoppingCart className="w-4 h-4" /> },
  { title: 'Purchasing Orders', href: '/dashboard/purchasing/orders', group: 'Purchasing', icon: <Package className="w-4 h-4" /> },
  { title: 'Supplier Agreements', href: '/dashboard/supplier-agreements', group: 'Purchasing', icon: <Package className="w-4 h-4" /> },

  // Finance & HR
  { title: 'Finance Payments', href: '/dashboard/finance/payments', group: 'Finance', icon: <DollarSign className="w-4 h-4" /> },
  { title: 'Cash Flow & Accounts', href: '/dashboard/finance/cash-flow', group: 'Finance', icon: <DollarSign className="w-4 h-4" /> },
  { title: 'Employees', href: '/dashboard/employees', group: 'HR & Payroll', icon: <Users className="w-4 h-4" /> },
  { title: 'Payroll Management', href: '/dashboard/hr/payroll', group: 'HR & Payroll', icon: <DollarSign className="w-4 h-4" /> },

  // Reports & System
  { title: 'Financial Reports', href: '/dashboard/reports/financial', group: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
  { title: 'Sales Reports', href: '/dashboard/reports/sales', group: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
  { title: 'Stock & Inventory Reports', href: '/dashboard/reports/stock', group: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
  { title: 'User Management', href: '/dashboard/users', group: 'System', icon: <Shield className="w-4 h-4" /> },
  { title: 'System Approvals', href: '/dashboard/system/approvals', group: 'System', icon: <Shield className="w-4 h-4" /> },
  { title: 'Audit & Activity Log', href: '/dashboard/system/activity', group: 'System', icon: <Shield className="w-4 h-4" /> },
];

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandMenu({ isOpen, onClose }: CommandMenuProps) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const filteredRoutes = React.useMemo(() => {
    if (!query.trim()) return erpRoutes;
    const q = query.toLowerCase().trim();
    return erpRoutes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q) ||
        r.href.toLowerCase().includes(q)
    );
  }, [query]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredRoutes.length + 3));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredRoutes.length + 3) % (filteredRoutes.length + 3));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex < filteredRoutes.length) {
          const route = filteredRoutes[selectedIndex];
          if (route) {
            router.push(route.href);
            onClose();
          }
        } else {
          const themeIndex = selectedIndex - filteredRoutes.length;
          if (themeIndex === 0) setTheme('light');
          if (themeIndex === 1) setTheme('dark');
          if (themeIndex === 2) setTheme('system');
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredRoutes, selectedIndex, router, setTheme]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-border gap-3">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all ERP modules, commands, or reports... (Esc to close)"
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground outline-none text-foreground"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/20">
          {filteredRoutes.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matching ERP pages or modules found.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Modules & Pages
              </div>
              {filteredRoutes.map((route, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={route.href}
                    onClick={() => {
                      router.push(route.href);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer',
                      isSelected
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-muted-foreground">{route.icon}</span>
                      <span>{route.title}</span>
                      <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted/60">
                        {route.group}
                      </span>
                    </div>
                    <ArrowRight className={cn('w-3.5 h-3.5 text-muted-foreground', isSelected ? 'opacity-100' : 'opacity-0')} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Themes quick section */}
          <div className="pt-2 mt-2 space-y-1">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Preferences
            </div>
            {[
              { name: 'Light Theme', icon: <Sun className="w-4 h-4" />, action: () => setTheme('light') },
              { name: 'Dark Theme', icon: <Moon className="w-4 h-4" />, action: () => setTheme('dark') },
              { name: 'System Theme', icon: <Laptop className="w-4 h-4" />, action: () => setTheme('system') },
            ].map((themeOpt, idx) => {
              const themeIndex = filteredRoutes.length + idx;
              const isSelected = selectedIndex === themeIndex;
              return (
                <button
                  key={themeOpt.name}
                  onClick={() => {
                    themeOpt.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(themeIndex)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer',
                    isSelected
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  <span className="text-muted-foreground">{themeOpt.icon}</span>
                  <span>{themeOpt.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">↓</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">↵</kbd>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">Esc to close</kbd>
        </div>
      </div>
    </div>
  );
}

export default CommandMenu;
