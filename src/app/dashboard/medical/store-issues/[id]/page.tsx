'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';

interface StoreIssueItem {
  productName: string;
  batchNo?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface StoreIssue {
  id: string;
  issueNo: string;
  customerId: string;
  customer?: {
    companyName: string;
    code: string;
    licenseNo?: string;
  };
  items: string | StoreIssueItem[];
  totalAmount: number;
  issuedBy?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function StoreIssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [issue, setIssue] = useState<StoreIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchIssue();
  }, [params.id]);

  const fetchIssue = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/medical/store-issues/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setIssue(data.data);
      } else {
        setError(data.error || 'Failed to fetch store issue');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/medical/store-issues/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        setIssue(data.data);
        if (data.invoice) {
          alert(`Invoice ${data.invoice.invoiceNo} created automatically (ETB ${data.invoice.totalAmount?.toLocaleString('en-US')})`);
        }
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const parseItems = (items: string | StoreIssueItem[]): StoreIssueItem[] => {
    if (typeof items === 'string') {
      try {
        return JSON.parse(items);
      } catch {
        return [];
      }
    }
    return items || [];
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-[#86868B]/10 text-[#86868B]';
      case 'Issued':
      case 'Pending':
        return 'bg-[#FF9500]/10 text-[#C93400]';
      case 'Delivered':
        return 'bg-[#34C759]/10 text-[#248A3D]';
      case 'Cancelled':
        return 'bg-[#FF3B30]/10 text-[#D70015]';
      default:
        return 'bg-[#007AFF]/10 text-[#0055D4]';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[#86868B]">Loading store issue...</div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/medical/store-issues" className="text-[#007AFF] flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Store Issues
        </Link>
        <Card className="rounded-2xl">
          <CardBody className="p-6 text-center text-[#FF3B30]">
            {error || 'Store issue not found'}
          </CardBody>
        </Card>
      </div>
    );
  }

  const items = parseItems(issue.items);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#86868B]">
        <Link href="/dashboard" className="text-[#007AFF] hover:text-[#0055D4]">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/medical/store-issues" className="text-[#007AFF] hover:text-[#0055D4]">Store Issues</Link>
        <span>/</span>
        <span className="text-[#1D1D1F] font-medium">{issue.issueNo}</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F]">{issue.issueNo}</h1>
          <p className="text-[#86868B] mt-1">
            Created {new Date(issue.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusColor(issue.status)}`}>
          {issue.status}
        </span>
      </div>

      {/* Details Card */}
      <Card className="rounded-2xl">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Issue Details</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Customer</p>
              <p className="text-[#1D1D1F] font-medium">{issue.customer?.companyName || '-'}</p>
              {issue.customer?.code && <p className="text-sm text-[#86868B]">Code: {issue.customer.code}</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">License No</p>
              <p className="text-[#1D1D1F]">{issue.customer?.licenseNo || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Issued By</p>
              <p className="text-[#1D1D1F]">{issue.issuedBy || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-[#007AFF]">ETB {(issue.totalAmount || 0).toLocaleString('en-US')}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Items Table */}
      <Card className="rounded-2xl">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Items ({items.length})</h2>
        </CardHeader>
        <CardBody>
          {items.length === 0 ? (
            <p className="text-center text-[#86868B] py-6">No items found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#D2D2D7]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">#</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">Product</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#86868B]">Batch No</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868B]">Qty</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868B]">Unit Price</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#86868B]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-[#F5F5F7]">
                      <td className="py-3 px-4 text-sm text-[#86868B]">{idx + 1}</td>
                      <td className="py-3 px-4 text-sm font-medium text-[#1D1D1F]">{item.productName}</td>
                      <td className="py-3 px-4 text-sm text-[#86868B]">{item.batchNo || '-'}</td>
                      <td className="py-3 px-4 text-sm text-right text-[#1D1D1F]">{item.quantity}</td>
                      <td className="py-3 px-4 text-sm text-right text-[#1D1D1F]">
                        {(item.unitPrice || 0).toLocaleString('en-US')}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-[#1D1D1F]">
                        ETB {(item.total || 0).toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#D2D2D7]">
                    <td colSpan={5} className="py-3 px-4 text-right font-bold text-[#1D1D1F]">Total</td>
                    <td className="py-3 px-4 text-right font-bold text-[#007AFF]">
                      ETB {(issue.totalAmount || 0).toLocaleString('en-US')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Actions */}
      <Card className="rounded-2xl">
        <CardBody>
          <div className="flex gap-3">
            {issue.status === 'Draft' && (
              <Button
                variant="primary"
                onClick={() => handleStatusUpdate('Issued')}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Mark as Issued'}
              </Button>
            )}
            {issue.status === 'Issued' && (
              <Button
                variant="primary"
                onClick={() => handleStatusUpdate('Delivered')}
                disabled={updating}
                style={{ backgroundColor: '#34C759' }}
              >
                {updating ? 'Processing...' : 'Mark as Delivered (Auto-Invoice)'}
              </Button>
            )}
            {(issue.status === 'Draft' || issue.status === 'Issued') && (
              <Button
                variant="secondary"
                onClick={() => handleStatusUpdate('Cancelled')}
                disabled={updating}
              >
                Cancel Issue
              </Button>
            )}
            <Link href="/dashboard/medical/store-issues">
              <Button variant="secondary">Back to List</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
