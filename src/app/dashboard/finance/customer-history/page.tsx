'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader, Input, Badge } from '@/components/ui';
import { Users, TrendingDown, TrendingUp, AlertTriangle, ChevronDown, ChevronRight, CreditCard, FileText } from 'lucide-react';

interface CustomerSummary {
  id: string;
  code: string;
  companyName: string;
  phone: string;
  tin: string | null;
  creditLimit: number;
  creditTermDays: number;
  totalInvoiced: number;
  totalPaid: number;
  pendingPayments: number;
  outstandingBalance: number;
  deliveredNotInvoiced: number;
  deliveredNotInvoicedCount: number;
  totalOutstanding: number;
  invoiceCount: number;
  unpaidInvoices: number;
  partialInvoices: number;
  paidInvoices: number;
  paymentCount: number;
  oldestUnpaidDate: string | null;
  daysSinceOldest: number;
  recentInvoices: { id: string; invoiceNo: string; totalAmount: number; paidAmount?: number; remainingAmount?: number; status: string; invoiceDate: string }[];
  recentPayments: { id: string; receiptNo: string; amount: number; status: string; paymentDate: string; paymentMethod: string }[];
}

interface Totals {
  totalCustomers: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalDeliveredNotInvoiced: number;
  totalPending: number;
  customersWithDebt: number;
}

export default function CustomerHistoryPage() {
  const [data, setData] = useState<CustomerSummary[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'has_debt' | 'paid_up'>('all');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (filter !== 'all') params.set('filter', filter);
        const res = await fetch(`/api/finance/customer-history?${params}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data || []);
          setTotals(json.totals || null);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    const timeout = setTimeout(fetchData, 300);
    return () => clearTimeout(timeout);
  }, [search, filter]);

  const fmt = (val: number) =>
    `ETB ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const toggleExpand = (id: string) => {
    setExpandedCustomer(expandedCustomer === id ? null : id);
  };

  const getDebtLevel = (customer: CustomerSummary) => {
    if (customer.totalOutstanding <= 0) return 'clear';
    if (customer.daysSinceOldest > 60) return 'critical';
    if (customer.daysSinceOldest > 30) return 'warning';
    return 'normal';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-7 h-7 text-[#007AFF]" />
          Customer Debt Summary
        </h1>
        <p className="text-sm text-slate-500 w-full">Cement, Construction &amp; Aggregate &mdash; invoices, payments &amp; outstanding balances</p>
      </div>

      {/* Summary Cards */}
      {totals && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-2xl font-bold text-[#1D1D1F]">{totals.totalCustomers}</p>
              <p className="text-xs text-[#86868B] uppercase font-medium">Customers</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-2xl font-bold text-[#007AFF]">{fmt(totals.totalInvoiced)}</p>
              <p className="text-xs text-[#86868B] uppercase font-medium">Total Invoiced</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-2xl font-bold text-[#34C759]">{fmt(totals.totalPaid)}</p>
              <p className="text-xs text-[#86868B] uppercase font-medium">Total Collected</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-2xl font-bold text-[#FF9500]">{fmt(totals.totalDeliveredNotInvoiced)}</p>
              <p className="text-xs text-[#86868B] uppercase font-medium">Delivered (Not Invoiced)</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-2xl font-bold text-[#FF3B30]">{fmt(totals.totalOutstanding)}</p>
              <p className="text-xs text-[#86868B] uppercase font-medium">Total Outstanding</p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by customer name, code, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-2">
              {([
                { key: 'all', label: 'All' },
                { key: 'has_debt', label: 'Has Debt' },
                { key: 'paid_up', label: 'Paid Up' },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f.key
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            {loading ? 'Loading...' : `${data.length} customers`}
            {totals && totals.customersWithDebt > 0 && !loading && (
              <span className="ml-2 text-red-600 font-medium">
                ({totals.customersWithDebt} with outstanding debt)
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Customer List */}
      {loading ? (
        <Card><CardBody className="py-12 text-center text-slate-500">Loading customer data...</CardBody></Card>
      ) : data.length === 0 ? (
        <Card><CardBody className="py-12 text-center text-slate-500">No customers found</CardBody></Card>
      ) : (
        <div className="space-y-3">
          {data.map((customer) => {
            const debtLevel = getDebtLevel(customer);
            const isExpanded = expandedCustomer === customer.id;

            return (
              <Card key={customer.id} className={
                debtLevel === 'critical' ? 'border-l-4 border-l-red-500' :
                debtLevel === 'warning' ? 'border-l-4 border-l-amber-500' :
                debtLevel === 'clear' ? 'border-l-4 border-l-green-500' : ''
              }>
                <CardBody className="py-3">
                  {/* Customer header row */}
                  <button
                    onClick={() => toggleExpand(customer.id)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <span className="shrink-0">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#1D1D1F]">{customer.companyName}</span>
                        <span className="text-xs text-slate-500 font-mono">{customer.code}</span>
                        {customer.phone && <span className="text-xs text-slate-400">{customer.phone}</span>}
                        {debtLevel === 'critical' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> Overdue {customer.daysSinceOldest}d
                          </span>
                        )}
                        {debtLevel === 'warning' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> {customer.daysSinceOldest}d overdue
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 text-sm">
                        <span className="text-slate-500">
                          {customer.invoiceCount} invoices
                        </span>
                        {customer.unpaidInvoices > 0 && (
                          <span className="text-red-600 font-medium">{customer.unpaidInvoices} unpaid</span>
                        )}
                        {customer.partialInvoices > 0 && (
                          <span className="text-amber-600 font-medium">{customer.partialInvoices} partial</span>
                        )}
                      </div>
                    </div>

                    {/* Summary numbers */}
                    <div className="hidden md:flex gap-6 shrink-0 text-right">
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Invoiced</p>
                        <p className="text-sm font-semibold text-[#1D1D1F]">{fmt(customer.totalInvoiced)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Paid</p>
                        <p className="text-sm font-semibold text-[#34C759]">{fmt(customer.totalPaid)}</p>
                      </div>
                      {customer.deliveredNotInvoiced > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Delivered (No Inv.)</p>
                          <p className="text-sm font-semibold text-[#FF9500]">{fmt(customer.deliveredNotInvoiced)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500 uppercase">Total Outstanding</p>
                        <p className={`text-sm font-bold ${customer.totalOutstanding > 0 ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>
                          {fmt(customer.totalOutstanding)}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Mobile summary (visible below md) */}
                  <div className="md:hidden mt-2 grid grid-cols-2 gap-2 text-center border-t pt-2">
                    <div>
                      <p className="text-xs text-slate-500">Invoiced</p>
                      <p className="text-xs font-semibold">{fmt(customer.totalInvoiced)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Paid</p>
                      <p className="text-xs font-semibold text-green-600">{fmt(customer.totalPaid)}</p>
                    </div>
                    {customer.deliveredNotInvoiced > 0 && (
                      <div>
                        <p className="text-xs text-slate-500">Delivered (No Inv.)</p>
                        <p className="text-xs font-semibold text-amber-600">{fmt(customer.deliveredNotInvoiced)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500">Total Outstanding</p>
                      <p className={`text-xs font-bold ${customer.totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {fmt(customer.totalOutstanding)}
                      </p>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4 space-y-4">
                      {/* Delivered not invoiced info */}
                      {customer.deliveredNotInvoiced > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-sm text-orange-800">
                          <strong>Delivered but not invoiced:</strong> {customer.deliveredNotInvoicedCount} lifting(s) worth {fmt(customer.deliveredNotInvoiced)} have been delivered/verified but no invoice has been created yet.
                        </div>
                      )}

                      {/* Pending Payments info */}
                      {customer.pendingPayments > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
                          <strong>Pending verification:</strong> {fmt(customer.pendingPayments)} in payments awaiting verification
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Recent Invoices */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1 mb-2">
                            <FileText className="w-4 h-4" /> Recent Invoices
                          </h4>
                          {customer.recentInvoices.length === 0 ? (
                            <p className="text-sm text-slate-400">No invoices</p>
                          ) : (
                             <div className="space-y-1">
                              {customer.recentInvoices.map((inv) => {
                                const paid = inv.paidAmount ?? (inv.status === 'Paid' ? inv.totalAmount : 0);
                                const isPaid = inv.status === 'Paid';
                                const isPartial = inv.status === 'Partial';

                                return (
                                  <div key={inv.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                                    <div>
                                      <Link href={`/dashboard/sales/invoices/${inv.id}`} className="text-[#007AFF] hover:text-[#0055D4] font-medium">
                                        {inv.invoiceNo}
                                      </Link>
                                      <span className="text-xs text-slate-400 ml-2">{new Date(inv.invoiceDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <div className="font-medium text-slate-900">{fmt(inv.totalAmount)}</div>
                                        {(isPartial || isPaid) && (
                                          <div className="text-xs">
                                            <span className="text-slate-400 font-normal">Paid: </span>
                                            <span className={isPaid ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>{fmt(paid)}</span>
                                          </div>
                                        )}
                                      </div>
                                      <Badge status={inv.status === 'Paid' ? 'Active' : inv.status === 'Partial' ? 'Pending' : 'Lifted' as any}>
                                        {inv.status}
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Recent Payments */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1 mb-2">
                            <CreditCard className="w-4 h-4" /> Recent Payments
                          </h4>
                          {customer.recentPayments.length === 0 ? (
                            <p className="text-sm text-slate-400">No payments recorded</p>
                          ) : (
                            <div className="space-y-1">
                              {customer.recentPayments.map((pmt) => (
                                <div key={pmt.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                                  <div>
                                    <span className="font-medium text-slate-700">{pmt.receiptNo}</span>
                                    <span className="text-xs text-slate-400 ml-2">{new Date(pmt.paymentDate).toLocaleDateString()}</span>
                                    <span className="text-xs text-slate-400 ml-1">({pmt.paymentMethod})</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-green-700">{fmt(pmt.amount)}</span>
                                    <Badge status={pmt.status === 'Verified' ? 'Active' : 'Pending' as any}>
                                      {pmt.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Customer credit info */}
                      {(customer.creditLimit > 0 || customer.creditTermDays > 0) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-800">
                          Credit Limit: <strong>{fmt(customer.creditLimit)}</strong>
                          {customer.creditTermDays > 0 && <span className="ml-3">Payment Terms: <strong>{customer.creditTermDays} days</strong></span>}
                          <span className="ml-3">Total Outstanding: <strong>{fmt(customer.totalOutstanding)}</strong></span>
                          {customer.totalOutstanding > customer.creditLimit && customer.creditLimit > 0 && (
                            <span className="ml-3 text-red-600 font-bold">OVER LIMIT by {fmt(customer.totalOutstanding - customer.creditLimit)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
