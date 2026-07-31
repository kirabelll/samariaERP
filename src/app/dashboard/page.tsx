'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useI18n } from '@/lib/i18n';
import { Table, Badge, Button } from '@/components/ui';
import { StatCard } from '@/components/ui/Card';
import type { ColumnDef } from '@/components/ui';
import Link from 'next/link';
import {
  DollarSign,
  Wallet,
  Users,
  CheckSquare,
  Truck,
  Package,
} from 'lucide-react';

interface DashboardStats {
  summary: {
    totalCustomers: number;
    totalSuppliers: number;
    totalEmployees: number;
    totalFactories: number;
    totalTransporters: number;
    totalItems: number;
    totalRevenue: number;
    outstandingReceivables: number;
    pendingApprovals: number;
  };
  charts: {
    recentOrders: any[];
    recentInvoices: any[];
    lowStockItems: any[];
  };
  activities: {
    id: number;
    action: string;
    module: string;
    user: string;
    timestamp: string;
  }[];
}

interface ActivityLog {
  id: number;
  action: string;
  module: string;
  user: string;
  timestamp: string;
}

const getDashboardDate = () => {
  const date = new Date();
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const fmtMoney = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        const json = await res.json();
        if (json.success) setStats(json.data);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const s = stats?.summary;
  const firstName = session?.user?.name?.split(' ')[0] || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Greeting */}
      <div>
        <div className="t-h1">
          {getGreeting()}{firstName ? `, ${firstName}` : ''}
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          color: 'var(--fg-2)',
          marginTop: 6,
        }}>
          {getDashboardDate()}
        </div>
      </div>

      {/* Top KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard
          label="Total Revenue"
          value={s ? `${(s.totalRevenue / 1e6).toFixed(2)}M` : '—'}
          icon={<DollarSign className="w-5 h-5" />}
          tint="#E5F0FF"
          color="#0B6DE5"
        />
        <StatCard
          label="Receivables"
          value={s ? `${(s.outstandingReceivables / 1e6).toFixed(2)}M` : '—'}
          icon={<Wallet className="w-5 h-5" />}
          tint="#FFF3E0"
          color="#C93400"
        />
        <StatCard
          label="Active Customers"
          value={s ? String(s.totalCustomers) : '—'}
          icon={<Users className="w-5 h-5" />}
          tint="#E8F7EC"
          color="#248A3D"
          mono={false}
        />
        <StatCard
          label="Pending Approvals"
          value={s ? String(s.pendingApprovals) : '—'}
          icon={<CheckSquare className="w-5 h-5" />}
          tint="#FFEDEC"
          color="#D70015"
          mono={false}
        />
      </div>

      {/* Secondary KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <StatCard
          label="Total Suppliers"
          value={s ? String(s.totalSuppliers) : '—'}
          icon={<Truck className="w-5 h-5" />}
          tint="#E5F0FF"
          color="#0B6DE5"
          mono={false}
        />
        <StatCard
          label="Total Items"
          value={s ? String(s.totalItems) : '—'}
          icon={<Package className="w-5 h-5" />}
          tint="#F0EFFD"
          color="#5856D6"
          mono={false}
        />
        <StatCard
          label="Active Employees"
          value={s ? String(s.totalEmployees) : '—'}
          icon={<Users className="w-5 h-5" />}
          tint="#E8F7EC"
          color="#248A3D"
          mono={false}
        />
      </div>

      {/* Quick Links */}
      <div style={{
        background: 'var(--surface-0)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        padding: 24,
      }}>
        <div className="t-h3" style={{ marginBottom: 18 }}>Quick Links</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {[
            { href: '/dashboard/customers', icon: <Users className="w-6 h-6" />, label: 'Customers' },
            { href: '/dashboard/suppliers', icon: <Package className="w-6 h-6" />, label: 'Suppliers' },
            { href: '/dashboard/items', icon: <Package className="w-6 h-6" />, label: 'Items' },
            { href: '/dashboard/factories', icon: <Package className="w-6 h-6" />, label: 'Factories' },
            { href: '/dashboard/transporters', icon: <Truck className="w-6 h-6" />, label: 'Transporters' },
            { href: '/dashboard/employees', icon: <Users className="w-6 h-6" />, label: 'Employees' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center justify-center p-4 rounded-xl transition-colors"
              style={{ background: 'var(--surface-2)', color: 'var(--fg-1)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
            >
              <span style={{ color: 'var(--fg-2)', marginBottom: 8 }}>{link.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'var(--surface-0)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div className="t-h3">Recent Activity</div>
          <Link href="/dashboard/system/activity">
            <Button size="sm" variant="outline">View all</Button>
          </Link>
        </div>
        <div style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fg-2)' }}>
              Loading dashboard data...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border)' }}>
                  {['Time', 'User', 'Action', 'Module'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left',
                      padding: '12px 24px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--fg-2)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats?.activities || []).slice(0, 10).map((a, i) => (
                  <tr
                    key={a.id || i}
                    style={{ borderBottom: '1px solid var(--surface-2)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}
                  >
                    <td style={{
                      padding: '14px 24px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--fg-2)',
                    }}>
                      {a.timestamp ? new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{
                      padding: '14px 24px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--fg-1)',
                    }}>
                      {a.user}
                    </td>
                    <td style={{
                      padding: '14px 24px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 14,
                      fontWeight: 400,
                      color: 'var(--fg-1)',
                    }}>
                      {a.action}
                    </td>
                    <td style={{
                      padding: '14px 24px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--fg-2)',
                    }}>
                      {a.module}
                    </td>
                  </tr>
                ))}
                {(!stats?.activities || stats.activities.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{
                      textAlign: 'center',
                      padding: '40px 24px',
                      color: 'var(--fg-2)',
                      fontSize: 14,
                    }}>
                      No recent activity
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
