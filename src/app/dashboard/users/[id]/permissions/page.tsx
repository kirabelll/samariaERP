'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button } from '@/components/ui';
import { ChevronLeft, Save, Shield, Check, Loader } from 'lucide-react';

// All pages/sub-modules grouped by section — mirrors the Sidebar structure
const PAGE_GROUPS: { section: string; pages: string[] }[] = [
  {
    section: 'MAIN',
    pages: ['Dashboard'],
  },
  {
    section: 'MASTER DATA',
    pages: ['Customers', 'Suppliers', 'Factories', 'Transport Associations', 'Transporters', 'Transport Agreements', 'Items/Products', 'Employees', 'Users & Roles'],
  },
  {
    section: 'CONSTRUCTION',
    pages: ['Aggregate Dispatch', 'Proof Register', 'Shortage Verification', 'Daily Reconciliation', 'Aggregate Summary', 'Cement Purchases', 'Cement Liftings', 'Weighbridge', 'Factory Balance', 'Coupons', 'Penalties & Recovery'],
  },
  {
    section: 'MEDICAL',
    pages: ['Licensed Customers', 'Purchase Requests', 'Store Management', 'Pricing & Offers', 'Store Issues', 'Stock Adjustments', 'Commission'],
  },
  {
    section: 'COMMERCIAL',
    pages: ['Customer Agreements', 'Proformas', 'Sales Orders', 'Invoices', 'Deliveries'],
  },
  {
    section: 'PURCHASING',
    pages: ['Purchase Orders', 'Supplier Agreements', 'Goods Receiving', 'Supplier Payments', 'Payment Module', 'Transporter Recoveries'],
  },
  {
    section: 'FINANCE',
    pages: ['Chart of Accounts', 'Journal Entries', 'Bank Accounts', 'VAT Management', 'Cashbook', 'Customer Debt Summary', 'Cement Purchase Review', 'Cement Invoices', 'Customer Payments', 'Payment Vouchers', 'Customer Deposits', 'Daily Cash', 'Bank Reconciliation'],
  },
  {
    section: 'HR & PAYROLL',
    pages: ['Attendance', 'Leave Management', 'Payroll Processing', 'Tax & Pension Setup', 'Employee Advances'],
  },
  {
    section: 'REPORTS',
    pages: ['Sales Reports', 'Purchase Reports', 'Financial Reports', 'Stock Reports', 'HR Reports', 'Construction Reports', 'Medical Reports', 'Exception Reports', 'Outstanding Report'],
  },
  {
    section: 'SYSTEM',
    pages: ['Approvals', 'Activity Log', 'Documents', 'Notifications', 'Exception Center', 'Settings'],
  },
];

const ALL_PAGES = PAGE_GROUPS.flatMap(g => g.pages);

export default function UserPermissionsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [allowedPages, setAllowedPages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      try {
        // Fetch user info
        const userRes = await fetch(`/api/users/${userId}`);
        const userData = await userRes.json();
        if (userData.success && userData.data) {
          setUserName(`${userData.data.firstName || ''} ${userData.data.lastName || ''}`.trim() || userData.data.email);
          setUserRole(userData.data.role);
        }

        // Fetch existing permissions
        const permRes = await fetch(`/api/users/${userId}/permissions`);
        const permData = await permRes.json();
        if (permData.success && permData.data) {
          const existing = (permData.data.permissions || []).map((p: any) => p.module);
          if (existing.length > 0) {
            setAllowedPages(new Set(existing));
          } else {
            // If no per-user permissions set yet, default to all pages (no restrictions)
            setAllowedPages(new Set(ALL_PAGES));
          }
        }
      } catch (err) {
        console.error('Failed to load permissions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const togglePage = (page: string) => {
    const next = new Set(allowedPages);
    if (next.has(page)) {
      next.delete(page);
    } else {
      next.add(page);
    }
    setAllowedPages(next);
    setSaved(false);
  };

  const toggleSection = (section: string) => {
    const group = PAGE_GROUPS.find(g => g.section === section);
    if (!group) return;
    const allChecked = group.pages.every(p => allowedPages.has(p));
    const next = new Set(allowedPages);
    if (allChecked) {
      group.pages.forEach(p => next.delete(p));
    } else {
      group.pages.forEach(p => next.add(p));
    }
    setAllowedPages(next);
    setSaved(false);
  };

  const selectAll = () => {
    setAllowedPages(new Set(ALL_PAGES));
    setSaved(false);
  };

  const deselectAll = () => {
    setAllowedPages(new Set());
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedPages: Array.from(allowedPages) }),
      });
      const json = await res.json();
      if (json.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert(json.error || 'Failed to save permissions');
      }
    } catch {
      alert('Failed to save permissions');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#86868B]">
        <Link href="/dashboard/users" className="text-[#007AFF] hover:text-[#0055D4]">
          <ChevronLeft className="w-4 h-4 inline" /> Users
        </Link>
        <span>/</span>
        <Link href={`/dashboard/users/${userId}`} className="text-[#007AFF] hover:text-[#0055D4]">
          {userName}
        </Link>
        <span>/</span>
        <span className="text-[#1D1D1F] font-medium">Permissions</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F]">
            <Shield className="w-7 h-7 inline mr-2 text-blue-600" />
            User Permissions
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure which pages <span className="font-semibold text-slate-700">{userName}</span> ({userRole}) can access
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button>
          <Button variant="primary" size="lg" onClick={handleSave} isLoading={saving}>
            {saved ? <><Check className="w-4 h-4 mr-1" /> Saved</> : <><Save className="w-4 h-4 mr-1" /> Save Permissions</>}
          </Button>
        </div>
      </div>

      {isAdminOrManager && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>Note:</strong> {userName} has role <strong>{userRole}</strong> which grants full access by default.
          Per-page permissions you set here will still be saved and will take effect if the role is changed later.
        </div>
      )}

      {/* Permission Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PAGE_GROUPS.map((group) => {
          const checkedCount = group.pages.filter(p => allowedPages.has(p)).length;
          const allChecked = checkedCount === group.pages.length;
          const someChecked = checkedCount > 0 && !allChecked;

          return (
            <Card key={group.section} className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked; }}
                      onChange={() => toggleSection(group.section)}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-base font-semibold text-[#1D1D1F]">{group.section}</span>
                  </label>
                  <span className="text-xs text-slate-400 font-medium">
                    {checkedCount}/{group.pages.length}
                  </span>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {group.pages.map((page) => (
                    <label
                      key={page}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={allowedPages.has(page)}
                        onChange={() => togglePage(page)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className={`text-sm ${allowedPages.has(page) ? 'text-[#1D1D1F] font-medium' : 'text-slate-400'}`}>
                        {page}
                      </span>
                    </label>
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Save Button (bottom) */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.push(`/dashboard/users/${userId}`)}>
          Cancel
        </Button>
        <Button variant="primary" size="lg" onClick={handleSave} isLoading={saving}>
          {saved ? <><Check className="w-4 h-4 mr-1" /> Saved</> : <><Save className="w-4 h-4 mr-1" /> Save Permissions</>}
        </Button>
      </div>
    </div>
  );
}
