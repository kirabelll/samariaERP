'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge, Table } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

interface MedicalRequest {
  id: string;
  requestNo: string;
  customer?: { name: string };
  customerId?: string;
  itemsSummary?: string;
  items?: string;
  priority: string;
  status: string;
  requestDate: string;
  createdAt: string;
}

interface BatchItem {
  id: string;
  itemId: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  warehouse: string;
  status: string;
  item?: { name: string; unit?: string };
}

export default function MedicalDivisionDashboard() {
  const { t } = useI18n();
  const [currentPage, setCurrentPage] = useState(1);
  const [requests, setRequests] = useState<MedicalRequest[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<BatchItem[]>([]);
  const [stats, setStats] = useState({
    activeCustomers: 0,
    pendingRequests: 0,
    nearExpiry: 0,
    openOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch requests and batches in parallel
      const [requestsRes, batchesRes] = await Promise.all([
        fetch('/api/medical/requests?limit=10').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch('/api/medical/batches?limit=50').then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      ]);

      const requestsData: MedicalRequest[] = requestsRes?.data || [];
      const batchesData: BatchItem[] = batchesRes?.data || [];

      setRequests(requestsData.slice(0, 5));

      // Filter batches near expiry (within 180 days)
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 180);

      const nearExpiry = batchesData.filter((b) => {
        const expiry = new Date(b.expiryDate);
        return expiry > now && expiry <= futureDate;
      });
      setExpiryAlerts(nearExpiry.slice(0, 5));

      // Calculate stats
      const pendingCount = requestsData.filter((r) =>
        ['Submitted', 'Quoted', 'Pending'].includes(r.status)
      ).length;
      const openCount = requestsData.filter((r) =>
        ['Submitted', 'Quoted', 'Approved', 'Released', 'Dispatched', 'Pending', 'InProgress'].includes(r.status)
      ).length;

      setStats({
        activeCustomers: requestsRes?.pagination?.total || requestsData.length,
        pendingRequests: pendingCount,
        nearExpiry: nearExpiry.length,
        openOrders: openCount,
      });
    } catch (err) {
      console.error('Error fetching medical dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryColor = (days: number) => {
    if (days <= 30) return 'bg-red-50';
    if (days <= 90) return 'bg-orange-50';
    return 'bg-yellow-50';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      Submitted: 'Pending',
      Quoted: 'InProgress',
      Approved: 'Approved',
      Released: 'InProgress',
      Dispatched: 'InProgress',
      Delivered: 'Completed',
      Pending: 'Pending',
      Draft: 'Draft',
    };
    return <Badge status={statusMap[status] || 'Draft'}>{status}</Badge>;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'Medium':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'Low':
        return 'bg-green-50 text-green-700 border border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const statCards = [
    { label: 'Total Requests', value: stats.activeCustomers, color: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Pending Requests', value: stats.pendingRequests, color: 'bg-yellow-50', iconColor: 'text-yellow-600' },
    { label: 'Items Near Expiry', value: stats.nearExpiry, color: 'bg-orange-50', iconColor: 'text-orange-600' },
    { label: 'Open Orders', value: stats.openOrders, color: 'bg-purple-50', iconColor: 'text-purple-600' },
  ];

  const requestColumns = [
    { header: 'Request No', accessor: 'requestNo' as const },
    {
      header: 'Customer',
      accessor: 'customerId' as const,
      render: (_val: string, row: MedicalRequest) => row.customer?.name || row.customerId || '-',
    },
    {
      header: 'Priority',
      accessor: 'priority' as const,
      render: (priority: string) => (
        <div className={`px-3 py-1 rounded text-xs font-semibold inline-block ${getPriorityColor(priority)}`}>
          {priority}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status' as const,
      render: (status: string) => getStatusBadge(status),
    },
    {
      header: 'Date',
      accessor: 'createdAt' as const,
      render: (val: string) => {
        try {
          return new Date(val).toLocaleDateString();
        } catch {
          return val;
        }
      },
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Medical Division</h1>
          <p className="text-gray-600 mt-1">Manage pharmaceutical requests, inventory, and customer licenses</p>
        </div>
        <Link href="/dashboard/medical/requests">
          <Button variant="primary" size="lg">
            + New Request
          </Button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="overflow-hidden">
            <CardBody className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? '...' : stat.value}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg flex items-center justify-center`}>
                <div className={`${stat.iconColor} text-2xl`}>
                  {index === 0 ? '📋' : index === 1 ? '⏳' : index === 2 ? '⚠️' : '📦'}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Recent Requests Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Medical Requests</h2>
          <Link href="/dashboard/medical/requests">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-center text-gray-600 py-4">Loading requests...</p>
          ) : (
            <Table
              data={requests}
              columns={requestColumns}
              emptyMessage="No recent requests"
              pageSize={10}
              currentPage={currentPage}
              totalPages={1}
              onPageChange={setCurrentPage}
            />
          )}
        </CardBody>
      </Card>

      {/* Expiry Alert List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Expiry Monitoring (Items expiring within 180 days)</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-center text-gray-600 py-4">Loading expiry data...</p>
          ) : expiryAlerts.length === 0 ? (
            <p className="text-center text-gray-600 py-4">No items near expiry</p>
          ) : (
            <div className="space-y-3">
              {expiryAlerts.map((item) => {
                const daysLeft = getDaysUntilExpiry(item.expiryDate);
                return (
                  <div key={item.id} className={`p-4 rounded-lg border border-gray-200 ${getExpiryColor(daysLeft)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.item?.name || item.itemId}</h3>
                        <div className="text-xs text-gray-600 mt-2 space-y-1">
                          <div>
                            <span className="font-medium">Batch:</span> {item.batchNo}
                          </div>
                          <div>
                            <span className="font-medium">Expiry Date:</span>{' '}
                            {new Date(item.expiryDate).toLocaleDateString()} ({daysLeft} days remaining)
                          </div>
                          <div>
                            <span className="font-medium">Stock:</span> {item.quantity} {item.item?.unit || 'units'}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {daysLeft <= 30 && (
                          <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded whitespace-nowrap">
                            URGENT
                          </span>
                        )}
                        {daysLeft > 30 && daysLeft <= 90 && (
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded whitespace-nowrap">
                            ALERT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Link href="/dashboard/medical/requests">
              <Button variant="outline" className="w-full">
                View All Requests
              </Button>
            </Link>
            <Link href="/dashboard/medical/store">
              <Button variant="outline" className="w-full">
                Manage Store
              </Button>
            </Link>
            <Link href="/dashboard/medical/stock-adjustments">
              <Button variant="outline" className="w-full">
                Stock Adjustments
              </Button>
            </Link>
            <Link href="/dashboard/medical/store-issues">
              <Button variant="outline" className="w-full">
                Store Issues
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
