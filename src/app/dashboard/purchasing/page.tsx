'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui';
import { ClipboardList, Package, CreditCard, Wallet, ArrowRight, Loader } from 'lucide-react';

interface ModuleStats {
  purchaseOrders: { total: number; pending: number };
  grv: { total: number; pending: number };
  payments: { total: number; pending: number };
}

export default function PurchasingIndexPage() {
  const [stats, setStats] = useState<ModuleStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [ordersRes, grvRes, paymentsRes] = await Promise.all([
          fetch('/api/purchasing/orders?limit=1').then(r => r.json()).catch(() => ({ pagination: { total: 0 } })),
          fetch('/api/purchasing/grv?limit=1').then(r => r.json()).catch(() => ({ pagination: { total: 0 } })),
          fetch('/api/purchasing/payments?limit=1').then(r => r.json()).catch(() => ({ pagination: { total: 0 } })),
        ]);

        setStats({
          purchaseOrders: {
            total: ordersRes?.pagination?.total || 0,
            pending: 0,
          },
          grv: {
            total: grvRes?.pagination?.total || 0,
            pending: 0,
          },
          payments: {
            total: paymentsRes?.pagination?.total || 0,
            pending: 0,
          },
        });
      } catch {
        // Stats are optional, page still works without them
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const modules = [
    {
      title: 'Purchase Orders',
      description: 'Create and manage purchase orders to suppliers',
      href: '/dashboard/purchasing/orders',
      icon: ClipboardList,
      color: 'bg-[#007AFF]/10 text-[#007AFF]',
      stat: stats?.purchaseOrders?.total,
    },
    {
      title: 'Goods Receiving (GRV)',
      description: 'Record goods received against purchase orders',
      href: '/dashboard/purchasing/grv',
      icon: Package,
      color: 'bg-[#34C759]/10 text-[#34C759]',
      stat: stats?.grv?.total,
    },
    {
      title: 'Supplier Payments',
      description: 'Track and process payments to suppliers',
      href: '/dashboard/purchasing/payments',
      icon: CreditCard,
      color: 'bg-[#FF9500]/10 text-[#FF9500]',
      stat: stats?.payments?.total,
    },
    {
      title: 'Payment Module',
      description: 'Advanced payment processing and batch operations',
      href: '/dashboard/purchasing/payment-module',
      icon: Wallet,
      color: 'bg-[#AF52DE]/10 text-[#AF52DE]',
      stat: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1D1D1F]">Purchasing</h1>
        <p className="text-[#86868B] mt-2">Manage purchase orders, goods receiving, and supplier payments</p>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href}>
              <Card className="rounded-2xl hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardBody className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${mod.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#1D1D1F]">{mod.title}</h3>
                        <p className="text-sm text-[#86868B] mt-1">{mod.description}</p>
                        {!loading && mod.stat != null && (
                          <p className="text-xs text-[#86868B] mt-2">
                            {mod.stat.toLocaleString('en-US')} record{mod.stat !== 1 ? 's' : ''}
                          </p>
                        )}
                        {loading && mod.stat !== null && (
                          <div className="mt-2">
                            <Loader className="w-3 h-3 animate-spin text-[#86868B]" />
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#86868B] mt-1" />
                  </div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
