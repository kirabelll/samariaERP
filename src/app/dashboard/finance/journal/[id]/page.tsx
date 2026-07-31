'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

interface JournalEntryData {
  id: string;
  voucherNo: string;
  accountId: string;
  account?: { accountCode: string; accountName: string; accountType: string };
  debit: number;
  credit: number;
  description: string;
  entryDate: string;
  refModule?: string;
  refId?: string;
  postedBy?: string;
  createdAt: string;
}

export default function JournalEntryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [data, setData] = useState<JournalEntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/finance/journal/${recordId}`);
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch record');
        }
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    if (recordId) fetchData();
  }, [recordId]);

  const handleBack = () => router.push('/dashboard/finance/journal');

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '—';
    return `ETB ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date?: string) => {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return date; }
  };

  const getSourceLink = () => {
    if (!data?.refModule || !data?.refId) return null;
    switch (data.refModule) {
      case 'PAYMENT_VOUCHER':
        return { href: `/dashboard/finance/vouchers/${data.refId}`, label: 'View Payment Voucher' };
      case 'PURCHASE_ORDER':
        return { href: `/dashboard/purchasing/purchase-orders/${data.refId}`, label: 'View Purchase Order' };
      case 'SALES_INVOICE':
        return { href: `/dashboard/invoices/${data.refId}`, label: 'View Sales Invoice' };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading journal entry...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
          ← Back to Journal Entries
        </button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Record not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const sourceLink = getSourceLink();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2 block">
            &larr; Back to Journal Entries
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1D1F]">{data.voucherNo}</h1>
          <p className="text-slate-500 mt-1">Journal Entry</p>
        </div>
        <div className="flex gap-4">
          {data.debit > 0 && (
            <div className="text-right">
              <p className="text-sm text-slate-500">Debit</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(data.debit)}</p>
            </div>
          )}
          {data.credit > 0 && (
            <div className="text-right">
              <p className="text-sm text-slate-500">Credit</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(data.credit)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Entry Details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Entry Details</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Voucher Number</p>
              <p className="text-base font-medium text-slate-900 mt-1">{data.voucherNo}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Entry Date</p>
              <p className="text-base font-medium text-slate-900 mt-1">{formatDate(data.entryDate)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Account</p>
              <p className="text-base font-medium text-slate-900 mt-1">
                {data.account ? `${data.account.accountCode} - ${data.account.accountName}` : data.accountId}
              </p>
              {data.account?.accountType && (
                <p className="text-sm text-slate-500">{data.account.accountType}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Posted By</p>
              <p className="text-base font-medium text-slate-900 mt-1">{data.postedBy || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</p>
              <p className="text-base font-medium text-slate-900 mt-1">{data.description || '—'}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Amounts */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1D1D1F]">Amounts</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Debit</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(data.debit)}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Credit</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{formatCurrency(data.credit)}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Source Reference */}
      {(data.refModule || data.refId) && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Source Reference</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Source Module</p>
                <p className="text-base font-medium text-slate-900 mt-1">
                  {data.refModule ? data.refModule.replace(/_/g, ' ') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reference ID</p>
                <p className="text-base font-medium text-slate-900 mt-1">{data.refId || '—'}</p>
              </div>
            </div>
            {sourceLink && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <Link
                  href={sourceLink.href}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  {sourceLink.label} &rarr;
                </Link>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
