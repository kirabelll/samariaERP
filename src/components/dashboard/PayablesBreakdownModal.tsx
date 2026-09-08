'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Search,
  Download,
  Building2,
  Phone,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CreditCard,
  Clock,
  RefreshCw,
  Truck,
  Layers,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface PayableItem {
  id: string;
  itemType: 'SUPPLIER_PAYMENT' | 'TRUCK_PAYMENT';
  refNo: string;
  secondaryRef: string | null;
  description: string;
  paymentMethod: string;
  date: string;
  amount: number;
  status: string;
  ageDays: number;
  ageBracket: string;
}

interface PayeeAccount {
  payeeId: string;
  payeeType: 'SUPPLIER' | 'TRANSPORTER' | 'FACTORY';
  categoryLabel: string;
  companyName: string;
  payeeCode: string;
  accountCode: string;
  accountName: string;
  phone: string;
  email: string | null;
  location: string | null;
  status: string;
  totalOutstanding: number;
  pendingCount: number;
  oldestAgeDays: number;
  items: PayableItem[];
}

interface PayablesData {
  totalPayables: number;
  payeeCount: number;
  totalPendingItems: number;
  agingSummary: {
    current: number;
    days30: number;
    days60: number;
    days90Plus: number;
  };
  payees: PayeeAccount[];
}

interface PayablesBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PayablesBreakdownModal({ isOpen, onClose }: PayablesBreakdownModalProps) {
  const [data, setData] = useState<PayablesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedBracket, setSelectedBracket] = useState<string>('ALL');
  const [expandedPayees, setExpandedPayees] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'vendor' | 'item'>('vendor');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/payables');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load payables breakdown');
      }
    } catch (err: any) {
      console.error('Error fetching payables:', err);
      setError('Failed to fetch data from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const toggleExpand = (payeeId: string) => {
    setExpandedPayees((prev) => {
      const next = new Set(prev);
      if (next.has(payeeId)) {
        next.delete(payeeId);
      } else {
        next.add(payeeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (data?.payees) {
      setExpandedPayees(new Set(data.payees.map((p) => p.payeeId)));
    }
  };

  const collapseAll = () => {
    setExpandedPayees(new Set());
  };

  // Filtered payees
  const filteredPayees = useMemo(() => {
    if (!data?.payees) return [];
    return data.payees.filter((p) => {
      // Type filter
      if (selectedType !== 'ALL' && p.payeeType !== selectedType) {
        return false;
      }
      // Aging bracket filter
      if (selectedBracket !== 'ALL') {
        const hasMatchingItem = p.items.some((it) => it.ageBracket === selectedBracket);
        if (!hasMatchingItem) return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.companyName.toLowerCase().includes(q);
        const matchesCode = p.payeeCode.toLowerCase().includes(q);
        const matchesAccount = p.accountCode.toLowerCase().includes(q);
        const matchesPhone = p.phone?.toLowerCase().includes(q);
        const matchesItem = p.items.some(
          (it) =>
            it.refNo.toLowerCase().includes(q) ||
            (it.secondaryRef && it.secondaryRef.toLowerCase().includes(q)) ||
            (it.description && it.description.toLowerCase().includes(q))
        );
        if (!matchesName && !matchesCode && !matchesAccount && !matchesPhone && !matchesItem) {
          return false;
        }
      }
      return true;
    });
  }, [data, search, selectedType, selectedBracket]);

  // Flat items list
  const filteredItems = useMemo(() => {
    const list: (PayableItem & { payeeName: string; payeeCode: string; accountCode: string; payeeType: string })[] = [];
    filteredPayees.forEach((p) => {
      p.items.forEach((it) => {
        if (selectedBracket === 'ALL' || it.ageBracket === selectedBracket) {
          if (
            !search.trim() ||
            it.refNo.toLowerCase().includes(search.toLowerCase()) ||
            p.companyName.toLowerCase().includes(search.toLowerCase()) ||
            p.payeeCode.toLowerCase().includes(search.toLowerCase())
          ) {
            list.push({
              ...it,
              payeeName: p.companyName,
              payeeCode: p.payeeCode,
              accountCode: p.accountCode,
              payeeType: p.payeeType,
            });
          }
        }
      });
    });
    return list.sort((a, b) => b.amount - a.amount);
  }, [filteredPayees, selectedBracket, search]);

  const totalFilteredAmount = useMemo(() => {
    return filteredPayees.reduce((sum, p) => sum + p.totalOutstanding, 0);
  }, [filteredPayees]);

  // Export CSV
  const handleExportCSV = () => {
    if (!data?.payees) return;
    const headers = [
      'Payee Type',
      'Payee Code',
      'Payee Name',
      'Account Code',
      'Phone',
      'Ref Number',
      'Description',
      'Payment Method',
      'Date',
      'Age (Days)',
      'Age Bracket',
      'Amount (ETB)',
      'Status',
    ];
    const rows: string[][] = [];

    filteredPayees.forEach((p) => {
      p.items.forEach((it) => {
        rows.push([
          `"${p.payeeType}"`,
          `"${p.payeeCode}"`,
          `"${p.companyName.replace(/"/g, '""')}"`,
          `"${p.accountCode}"`,
          `"${p.phone || ''}"`,
          `"${it.refNo}"`,
          `"${(it.description || '').replace(/"/g, '""')}"`,
          `"${it.paymentMethod || ''}"`,
          `"${new Date(it.date).toLocaleDateString('en-US')}"`,
          `"${it.ageDays}"`,
          `"${it.ageBracket}"`,
          `"${it.amount.toFixed(2)}"`,
          `"${it.status}"`,
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Payables_Breakdown_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
  };

  const getAgeBadge = (ageDays: number) => {
    if (ageDays > 90) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400">
          90+ days
        </span>
      );
    }
    if (ageDays > 60) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
          61-90 days
        </span>
      );
    }
    if (ageDays > 30) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400">
          31-60 days
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
        0-30 days
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-6xl rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Accounts Payable Breakdown
                </h2>
                <Badge
                  variant="outline"
                  className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs"
                >
                  Pending Liabilities
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detailed vendor & supplier ledger accounts, pending payments, and due obligations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              title="Refresh Data"
              className="h-9 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!data?.payees || data.payees.length === 0}
              className="h-9 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        {data && (
          <div className="p-4 sm:p-5 border-b border-border bg-card grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-muted/50 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Payables
                </span>
                <CreditCard className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground mt-1.5">
                {formatCurrency(data.totalPayables)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.payeeCount} vendors / transporters
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/50 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current (0-30d)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-1.5">
                {formatCurrency(data.agingSummary.current)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Standard payment terms</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/50 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Due Soon (31-60d)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-yellow-600 dark:text-yellow-400 mt-1.5">
                {formatCurrency(data.agingSummary.days30)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Schedule disbursement</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/50 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Overdue (60d+)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-red-600 dark:text-red-400 mt-1.5">
                {formatCurrency(data.agingSummary.days60 + data.agingSummary.days90Plus)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Urgent settlement</p>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-1 items-center gap-2.5">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by vendor, code, account (2010-...), payment #..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
            >
              <option value="ALL">All Payees</option>
              <option value="SUPPLIER">Suppliers</option>
              <option value="TRANSPORTER">Transporters</option>
            </select>

            <select
              value={selectedBracket}
              onChange={(e) => setSelectedBracket(e.target.value)}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
            >
              <option value="ALL">All Aging</option>
              <option value="0-30 days">0-30 days</option>
              <option value="31-60 days">31-60 days</option>
              <option value="61-90 days">61-90 days</option>
              <option value="90+ days">90+ days</option>
            </select>
          </div>

          <div className="flex items-center gap-2 justify-between md:justify-end">
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/60 text-xs font-medium">
              <button
                onClick={() => setViewMode('vendor')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'vendor'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                By Vendor Account
              </button>
              <button
                onClick={() => setViewMode('item')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'item'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Pending Items ({filteredItems.length})
              </button>
            </div>

            {viewMode === 'vendor' && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <button
                  onClick={expandAll}
                  className="hover:text-primary transition-colors cursor-pointer underline underline-offset-2"
                >
                  Expand All
                </button>
                <span>/</span>
                <button
                  onClick={collapseAll}
                  className="hover:text-primary transition-colors cursor-pointer underline underline-offset-2"
                >
                  Collapse All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm font-medium">Loading payables breakdown...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {error}
            </div>
          ) : filteredPayees.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="text-base font-semibold text-foreground">No Pending Payables Found</p>
              <p className="text-xs">All vendor obligations and truck fees have been settled.</p>
            </div>
          ) : viewMode === 'vendor' ? (
            /* By Vendor Account View */
            <div className="space-y-3">
              {filteredPayees.map((payee) => {
                const isExpanded = expandedPayees.has(payee.payeeId);
                return (
                  <div
                    key={payee.payeeId}
                    className="border border-border rounded-xl bg-card transition-all hover:border-border/90 shadow-2xs overflow-hidden"
                  >
                    {/* Payee Row Header */}
                    <div
                      onClick={() => toggleExpand(payee.payeeId)}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <button
                          type="button"
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground mt-0.5 sm:mt-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-primary" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-base text-foreground">
                              {payee.companyName}
                            </span>
                            <Badge variant="outline" className="text-xs font-mono bg-muted/60">
                              {payee.payeeCode}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            >
                              {payee.accountCode}
                            </Badge>
                            <Badge
                              variant={payee.payeeType === 'SUPPLIER' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {payee.categoryLabel}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                            {payee.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" />
                                {payee.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {payee.pendingCount} pending {payee.pendingCount === 1 ? 'item' : 'items'}
                            </span>
                            <span>
                              Age: {getAgeBadge(payee.oldestAgeDays)} ({payee.oldestAgeDays} days)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground font-medium">Pending Payable</div>
                          <div className="text-lg font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400">
                            {formatCurrency(payee.totalOutstanding)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={
                              payee.payeeType === 'SUPPLIER'
                                ? `/dashboard/suppliers/${payee.payeeId}`
                                : `/dashboard/transporters/${payee.payeeId}`
                            }
                            target="_blank"
                            title="View Profile"
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1 text-xs font-medium"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Profile</span>
                          </Link>
                          <Link
                            href="/dashboard/finance/vouchers/new"
                            target="_blank"
                            title="Issue Payment Voucher"
                            className="p-1.5 rounded-lg border border-border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors inline-flex items-center gap-1 text-xs font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Pay</span>
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Items Table */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-4 animate-in fade-in duration-150">
                        <div className="overflow-x-auto rounded-lg border border-border bg-card">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                              <tr>
                                <th className="p-2.5">Ref #</th>
                                <th className="p-2.5">Date</th>
                                <th className="p-2.5">Description</th>
                                <th className="p-2.5">Method</th>
                                <th className="p-2.5 text-right font-bold text-foreground">Amount (ETB)</th>
                                <th className="p-2.5 text-center">Age / Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-sans">
                              {payee.items.map((it) => (
                                <tr key={it.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="p-2.5 font-mono font-medium text-foreground">
                                    {it.refNo}
                                  </td>
                                  <td className="p-2.5 text-muted-foreground">
                                    {new Date(it.date).toLocaleDateString('en-US')}
                                  </td>
                                  <td className="p-2.5 text-foreground max-w-xs truncate">
                                    {it.description}
                                    {it.secondaryRef && (
                                      <span className="block text-[11px] text-muted-foreground">
                                        {it.secondaryRef}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2.5 capitalize text-muted-foreground">
                                    {it.paymentMethod || 'Bank Transfer'}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                    {formatCurrency(it.amount)}
                                  </td>
                                  <td className="p-2.5 text-center space-x-1">
                                    {getAgeBadge(it.ageDays)}
                                    <span className="text-[11px] text-muted-foreground">({it.status})</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Flat Items View */
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Ref #</th>
                    <th className="p-3">Vendor / Payee</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Method</th>
                    <th className="p-3 text-right font-bold text-foreground">Amount</th>
                    <th className="p-3 text-center">Aging Bracket</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems.map((it) => (
                    <tr key={it.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-semibold text-foreground">
                        {it.refNo}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{it.payeeName}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                          {it.payeeCode} • {it.accountCode}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(it.date).toLocaleDateString('en-US')}
                      </td>
                      <td className="p-3 text-foreground max-w-xs truncate">
                        {it.description}
                      </td>
                      <td className="p-3 capitalize text-muted-foreground">
                        {it.paymentMethod || 'Bank Transfer'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(it.amount)}
                      </td>
                      <td className="p-3 text-center">
                        {getAgeBadge(it.ageDays)}
                        <span className="block text-[10px] text-muted-foreground mt-0.5">{it.ageDays} days</span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {it.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{filteredPayees.length}</strong> of{' '}
              <strong className="text-foreground">{data?.payeeCount || 0}</strong> payees
            </span>
            <span>•</span>
            <span>
              Filtered Total:{' '}
              <strong className="font-mono text-rose-600 dark:text-rose-400 font-bold">
                {formatCurrency(totalFilteredAmount)}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/finance/vouchers"
              target="_blank"
              className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted font-medium transition-colors"
            >
              Payment Vouchers
            </Link>
            <Button variant="default" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayablesBreakdownModal;
