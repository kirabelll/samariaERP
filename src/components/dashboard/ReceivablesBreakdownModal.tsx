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
  Wallet,
  Clock,
  RefreshCw,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface InvoiceDetail {
  id: string;
  invoiceNo: string;
  division: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  ageDays: number;
  ageBracket: string;
}

interface CustomerReceivable {
  customerId: string;
  customerCode: string;
  companyName: string;
  accountCode: string;
  accountName: string;
  phone: string;
  email: string | null;
  location: string | null;
  division: string;
  creditLimit: number;
  creditTermDays: number;
  status: string;
  totalOutstanding: number;
  invoiceCount: number;
  oldestAgeDays: number;
  oldestInvoiceDate: string;
  invoices: InvoiceDetail[];
}

interface ReceivablesData {
  totalReceivables: number;
  customerCount: number;
  totalInvoices: number;
  agingSummary: {
    current: number;
    days30: number;
    days60: number;
    days90Plus: number;
  };
  customers: CustomerReceivable[];
}

interface ReceivablesBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReceivablesBreakdownModal({ isOpen, onClose }: ReceivablesBreakdownModalProps) {
  const [data, setData] = useState<ReceivablesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedBracket, setSelectedBracket] = useState<string>('ALL');
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'customer' | 'invoice'>('customer');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/receivables');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load receivables breakdown');
      }
    } catch (err: any) {
      console.error('Error fetching receivables:', err);
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

  const toggleExpand = (customerId: string) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (data?.customers) {
      setExpandedCustomers(new Set(data.customers.map((c) => c.customerId)));
    }
  };

  const collapseAll = () => {
    setExpandedCustomers(new Set());
  };

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!data?.customers) return [];
    return data.customers.filter((c) => {
      // Division filter
      if (selectedDivision !== 'ALL' && c.division !== selectedDivision) {
        return false;
      }
      // Aging bracket filter
      if (selectedBracket !== 'ALL') {
        const hasMatchingInvoice = c.invoices.some((inv) => inv.ageBracket === selectedBracket);
        if (!hasMatchingInvoice) return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = c.companyName.toLowerCase().includes(q);
        const matchesCode = c.customerCode.toLowerCase().includes(q);
        const matchesAccount = c.accountCode.toLowerCase().includes(q);
        const matchesPhone = c.phone?.toLowerCase().includes(q);
        const matchesInvoice = c.invoices.some((inv) => inv.invoiceNo.toLowerCase().includes(q));
        if (!matchesName && !matchesCode && !matchesAccount && !matchesPhone && !matchesInvoice) {
          return false;
        }
      }
      return true;
    });
  }, [data, search, selectedDivision, selectedBracket]);

  // All flat invoices for invoice view mode
  const filteredInvoices = useMemo(() => {
    const list: (InvoiceDetail & { customerName: string; customerCode: string; accountCode: string; customerId: string })[] = [];
    filteredCustomers.forEach((c) => {
      c.invoices.forEach((inv) => {
        if (selectedBracket === 'ALL' || inv.ageBracket === selectedBracket) {
          if (!search.trim() ||
              inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
              c.companyName.toLowerCase().includes(search.toLowerCase()) ||
              c.customerCode.toLowerCase().includes(search.toLowerCase())) {
            list.push({
              ...inv,
              customerName: c.companyName,
              customerCode: c.customerCode,
              accountCode: c.accountCode,
              customerId: c.customerId,
            });
          }
        }
      });
    });
    return list.sort((a, b) => b.balanceDue - a.balanceDue);
  }, [filteredCustomers, selectedBracket, search]);

  const totalFilteredAmount = useMemo(() => {
    return filteredCustomers.reduce((sum, c) => sum + c.totalOutstanding, 0);
  }, [filteredCustomers]);

  // Export CSV
  const handleExportCSV = () => {
    if (!data?.customers) return;
    const headers = ['Customer Code', 'Customer Name', 'Account Code', 'Phone', 'Division', 'Invoice No', 'Invoice Date', 'Age (Days)', 'Age Bracket', 'Invoice Total (ETB)', 'Paid (ETB)', 'Balance Due (ETB)', 'Status'];
    const rows: string[][] = [];

    filteredCustomers.forEach((c) => {
      c.invoices.forEach((inv) => {
        rows.push([
          `"${c.customerCode}"`,
          `"${c.companyName.replace(/"/g, '""')}"`,
          `"${c.accountCode}"`,
          `"${c.phone || ''}"`,
          `"${inv.division || c.division}"`,
          `"${inv.invoiceNo}"`,
          `"${new Date(inv.invoiceDate).toLocaleDateString('en-US')}"`,
          `"${inv.ageDays}"`,
          `"${inv.ageBracket}"`,
          `"${inv.totalAmount.toFixed(2)}"`,
          `"${inv.paidAmount.toFixed(2)}"`,
          `"${inv.balanceDue.toFixed(2)}"`,
          `"${inv.status}"`,
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Receivables_Breakdown_${new Date().toISOString().slice(0, 10)}.csv`);
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
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400">90+ days</span>;
    }
    if (ageDays > 60) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">61-90 days</span>;
    }
    if (ageDays > 30) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400">31-60 days</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">0-30 days</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-6xl rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Accounts Receivable Breakdown
                </h2>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                  Outstanding Credit
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detailed customer ledger accounts, open invoices, and payment aging analysis
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
              disabled={!data?.customers || data.customers.length === 0}
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
                  Total Receivables
                </span>
                <Wallet className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground mt-1.5">
                {formatCurrency(data.totalReceivables)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.customerCount} customers with debt
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
              <p className="text-xs text-muted-foreground mt-0.5">Within normal terms</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/50 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Overdue (31-60d)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-yellow-600 dark:text-yellow-400 mt-1.5">
                {formatCurrency(data.agingSummary.days30)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Follow-up needed</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/50 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Critical (60d+)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono tracking-tight text-red-600 dark:text-red-400 mt-1.5">
                {formatCurrency(data.agingSummary.days60 + data.agingSummary.days90Plus)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">High priority collection</p>
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
                placeholder="Search by customer, code, account (1030-...), phone, or invoice #..."
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
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
            >
              <option value="ALL">All Divisions</option>
              <option value="CONSTRUCTION">Construction</option>
              <option value="CEMENT">Cement</option>
              <option value="AGGREGATE">Aggregate</option>
              <option value="MEDICAL">Medical</option>
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
                onClick={() => setViewMode('customer')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'customer'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                By Customer Account
              </button>
              <button
                onClick={() => setViewMode('invoice')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'invoice'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Open Invoices ({filteredInvoices.length})
              </button>
            </div>

            {viewMode === 'customer' && (
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
              <p className="text-sm font-medium">Loading receivables breakdown...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {error}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <UserCheck className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <p className="text-base font-semibold text-foreground">No Outstanding Receivables Found</p>
              <p className="text-xs">All customers are currently settled or match no filter criteria.</p>
            </div>
          ) : viewMode === 'customer' ? (
            /* By Customer Account View */
            <div className="space-y-3">
              {filteredCustomers.map((cust) => {
                const isExpanded = expandedCustomers.has(cust.customerId);
                return (
                  <div
                    key={cust.customerId}
                    className="border border-border rounded-xl bg-card transition-all hover:border-border/90 shadow-2xs overflow-hidden"
                  >
                    {/* Customer Row Header */}
                    <div
                      onClick={() => toggleExpand(cust.customerId)}
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
                              {cust.companyName}
                            </span>
                            <Badge variant="outline" className="text-xs font-mono bg-muted/60">
                              {cust.customerCode}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                              {cust.accountCode}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {cust.division}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                            {cust.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" />
                                {cust.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {cust.invoiceCount} open {cust.invoiceCount === 1 ? 'invoice' : 'invoices'}
                            </span>
                            <span>
                              Oldest: {getAgeBadge(cust.oldestAgeDays)} ({cust.oldestAgeDays} days)
                            </span>
                            {cust.creditLimit > 0 && (
                              <span>
                                Credit Limit: {cust.creditLimit.toLocaleString('en-US')} ETB
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground font-medium">Balance Due</div>
                          <div className="text-lg font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
                            {formatCurrency(cust.totalOutstanding)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/dashboard/customers/${cust.customerId}`}
                            target="_blank"
                            title="View Customer Profile"
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1 text-xs font-medium"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Profile</span>
                          </Link>
                          <Link
                            href={`/dashboard/finance/customer-history?search=${encodeURIComponent(cust.companyName)}`}
                            target="_blank"
                            title="Open Customer Ledger / History"
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1 text-xs font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ledger</span>
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Invoices Table */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-4 animate-in fade-in duration-150">
                        <div className="overflow-x-auto rounded-lg border border-border bg-card">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                              <tr>
                                <th className="p-2.5">Invoice #</th>
                                <th className="p-2.5">Date</th>
                                <th className="p-2.5">Division</th>
                                <th className="p-2.5 text-right">Invoice Total</th>
                                <th className="p-2.5 text-right">Paid</th>
                                <th className="p-2.5 text-right font-bold text-foreground">Balance Due</th>
                                <th className="p-2.5 text-center">Age / Status</th>
                                <th className="p-2.5 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-sans">
                              {cust.invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="p-2.5 font-mono font-medium text-foreground">
                                    {inv.invoiceNo}
                                  </td>
                                  <td className="p-2.5 text-muted-foreground">
                                    {new Date(inv.invoiceDate).toLocaleDateString('en-US')}
                                  </td>
                                  <td className="p-2.5">
                                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                      {inv.division}
                                    </Badge>
                                  </td>
                                  <td className="p-2.5 text-right font-mono text-muted-foreground">
                                    {formatCurrency(inv.totalAmount)}
                                  </td>
                                  <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                    {inv.paidAmount > 0 ? formatCurrency(inv.paidAmount) : '—'}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                                    {formatCurrency(inv.balanceDue)}
                                  </td>
                                  <td className="p-2.5 text-center space-x-1">
                                    {getAgeBadge(inv.ageDays)}
                                    <span className="text-[11px] text-muted-foreground">({inv.status})</span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <Link
                                      href={`/dashboard/sales/invoices/${inv.id}`}
                                      target="_blank"
                                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                                    >
                                      View <ExternalLink className="w-3 h-3" />
                                    </Link>
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
            /* Flat Invoices View */
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Customer / Account</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Division</th>
                    <th className="p-3 text-right">Invoice Total</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right font-bold text-foreground">Balance Due</th>
                    <th className="p-3 text-center">Aging Bracket</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-semibold text-foreground">
                        {inv.invoiceNo}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{inv.customerName}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                          {inv.customerCode} • {inv.accountCode}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(inv.invoiceDate).toLocaleDateString('en-US')}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {inv.division}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono text-muted-foreground">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {inv.paidAmount > 0 ? formatCurrency(inv.paidAmount) : '—'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(inv.balanceDue)}
                      </td>
                      <td className="p-3 text-center">
                        {getAgeBadge(inv.ageDays)}
                        <span className="block text-[10px] text-muted-foreground mt-0.5">{inv.ageDays} days</span>
                      </td>
                      <td className="p-3 text-center">
                        <Link
                          href={`/dashboard/sales/invoices/${inv.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
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
              Showing <strong className="text-foreground">{filteredCustomers.length}</strong> of{' '}
              <strong className="text-foreground">{data?.customerCount || 0}</strong> customers
            </span>
            <span>•</span>
            <span>
              Filtered Total:{' '}
              <strong className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                {formatCurrency(totalFilteredAmount)}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/finance/customer-history"
              target="_blank"
              className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted font-medium transition-colors"
            >
              Open Full Finance Ledger
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

export default ReceivablesBreakdownModal;
