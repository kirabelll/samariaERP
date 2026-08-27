'use client';

import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle, Calendar, Filter, RotateCcw, FileText, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/Modal';

const VAT_RATE = 15;

interface VATInvoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  customer?: { name: string };
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
}

interface CementPurchaseVat {
  id: string;
  purchaseNo: string;
  cementType: string;
  createdAt: string;
  totalAmount: number;
  vatRate: number;
  vatAmount: number;
  factory?: { name: string };
}

interface VATPeriod {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  outputVat: number;
  inputVat: number;
  netVat: number;
  status: string;
  filedBy: string | null;
  filedDate: string | null;
}

interface VATSummary {
  totalOutputVat: number;
  totalInputVat: number;
  netVatPayable: number;
  salesInvoicesCount: number;
  cementPurchasesCount: number;
}

type DatePreset = 'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

function formatDateForInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPresetDateRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case 'this_month': {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return { from: formatDateForInput(start), to: formatDateForInput(end) };
    }
    case 'last_month': {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { from: formatDateForInput(start), to: formatDateForInput(end) };
    }
    case 'this_quarter': {
      const quarter = Math.floor(month / 3);
      const start = new Date(year, quarter * 3, 1);
      const end = new Date(year, (quarter + 1) * 3, 0);
      return { from: formatDateForInput(start), to: formatDateForInput(end) };
    }
    case 'this_year': {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return { from: formatDateForInput(start), to: formatDateForInput(end) };
    }
    case 'all':
    default:
      return { from: '', to: '' };
  }
}

export default function VATManagementPage() {
  const [periods, setPeriods] = useState<VATPeriod[]>([]);
  const [summary, setSummary] = useState<VATSummary | null>(null);
  const [salesInvoices, setSalesInvoices] = useState<VATInvoice[]>([]);
  const [cementPurchases, setCementPurchases] = useState<CementPurchaseVat[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<VATPeriod | null>(null);
  
  // Date filtering state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<DatePreset>('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [periodToFile, setPeriodToFile] = useState<VATPeriod | null>(null);
  const [actionType, setActionType] = useState<'file' | 'lock'>('file');
  const [creatingPeriod, setCreatingPeriod] = useState(false);

  useEffect(() => {
    fetchVATData(startDate, endDate, selectedPeriod?.id);
  }, []);

  const fetchVATData = async (from?: string, to?: string, periodId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      const effectiveFrom = from !== undefined ? from : startDate;
      const effectiveTo = to !== undefined ? to : endDate;
      const effectivePeriodId = periodId !== undefined ? periodId : selectedPeriod?.id;

      if (effectivePeriodId) {
        params.append('periodId', effectivePeriodId);
      } else {
        if (effectiveFrom) params.append('from', effectiveFrom);
        if (effectiveTo) params.append('to', effectiveTo);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/finance/vat${queryString}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        const periodsData = result.data?.periods || [];
        const summaryData = result.data?.summary || null;
        setPeriods(periodsData);
        setSummary(summaryData);
        setSalesInvoices(result.data?.salesInvoices || []);
        setCementPurchases(result.data?.cementPurchases || []);
      } else {
        setError('Failed to load VAT data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch VAT data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    setSelectedPeriod(null);
    const range = getPresetDateRange(preset);
    setStartDate(range.from);
    setEndDate(range.to);
    fetchVATData(range.from, range.to, '');
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setActivePreset('custom');
    setSelectedPeriod(null);
    fetchVATData(val, endDate, '');
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setActivePreset('custom');
    setSelectedPeriod(null);
    fetchVATData(startDate, val, '');
  };

  const handleResetFilters = () => {
    setActivePreset('all');
    setSelectedPeriod(null);
    setStartDate('');
    setEndDate('');
    fetchVATData('', '', '');
  };

  const handleSelectPeriod = (period: VATPeriod) => {
    if (selectedPeriod?.id === period.id) {
      // Toggle off
      setSelectedPeriod(null);
      fetchVATData(startDate, endDate, '');
    } else {
      setSelectedPeriod(period);
      fetchVATData(startDate, endDate, period.id);
    }
  };

  const handleFilePeriod = (period: VATPeriod) => {
    setPeriodToFile(period);
    setActionType('file');
    setIsConfirmDialogOpen(true);
  };

  const handleLockPeriod = (period: VATPeriod) => {
    setPeriodToFile(period);
    setActionType('lock');
    setIsConfirmDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!periodToFile) return;

    try {
      const response = await fetch('/api/finance/vat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: periodToFile.id, action: actionType }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${actionType} period`);
      }

      const result = await response.json();
      if (result.success) {
        await fetchVATData(startDate, endDate, selectedPeriod?.id);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsConfirmDialogOpen(false);
      setPeriodToFile(null);
    }
  };

  const handleCreateCurrentPeriod = async () => {
    try {
      setCreatingPeriod(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-indexed
      const periodName = `${year}-${String(month + 1).padStart(2, '0')}`;
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

      const response = await fetch('/api/finance/vat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodName, startDate: start, endDate: end }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchVATData(startDate, endDate, selectedPeriod?.id);
      } else {
        await fetchVATData(startDate, endDate, selectedPeriod?.id);
      }
    } catch (err) {
      console.error('Error creating period:', err);
      await fetchVATData(startDate, endDate, selectedPeriod?.id);
    } finally {
      setCreatingPeriod(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading && periods.length === 0 && !summary) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">VAT Management</h1>
          <p className="text-gray-600 mt-1">Manage VAT periods and filings (Ethiopian VAT Rate: {VAT_RATE}%)</p>
        </div>
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading VAT data...</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error && periods.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">VAT Management</h1>
          <p className="text-gray-600 mt-1">Manage VAT periods and filings (Ethiopian VAT Rate: {VAT_RATE}%)</p>
        </div>
        <Card>
          <CardBody>
            <p className="text-center text-red-600 py-8">Error: {error}</p>
            <div className="text-center">
              <Button variant="outline" onClick={() => fetchVATData(startDate, endDate, selectedPeriod?.id)}>
                Retry
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Determine active display totals
  const outputVAT = selectedPeriod ? selectedPeriod.outputVat : (summary?.totalOutputVat || 0);
  const inputVAT = selectedPeriod ? selectedPeriod.inputVat : (summary?.totalInputVat || 0);
  const netPayable = selectedPeriod ? selectedPeriod.netVat : (summary?.netVatPayable || 0);
  const invoiceCount = selectedPeriod ? salesInvoices.length : (summary?.salesInvoicesCount || 0);
  const purchaseCount = selectedPeriod ? cementPurchases.length : (summary?.cementPurchasesCount || 0);

  // Label for active filter scope
  let activeScopeLabel = 'All Time';
  if (selectedPeriod) {
    activeScopeLabel = `Period: ${selectedPeriod.periodName} (${formatDate(selectedPeriod.startDate)} – ${formatDate(selectedPeriod.endDate)})`;
  } else if (startDate && endDate) {
    activeScopeLabel = `${formatDate(startDate)} – ${formatDate(endDate)}`;
  } else if (startDate) {
    activeScopeLabel = `From ${formatDate(startDate)}`;
  } else if (endDate) {
    activeScopeLabel = `Up to ${formatDate(endDate)}`;
  }

  const isFiltered = Boolean(selectedPeriod || startDate || endDate || activePreset !== 'all');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">VAT Management</h1>
          <p className="text-gray-600 mt-1">Manage VAT periods, calculations and filings (Ethiopian VAT Rate: {VAT_RATE}%)</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCreateCurrentPeriod}
            disabled={creatingPeriod}
          >
            {creatingPeriod ? 'Creating...' : '+ Current Month Period'}
          </Button>
        </div>
      </div>

      {/* Date Filter Card */}
      <Card className="p-4 sm:p-5 bg-white shadow-xs border border-gray-200">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-800">Date Range & Presets</span>
              {isFiltered && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {activeScopeLabel}
                </span>
              )}
            </div>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Button
              size="sm"
              variant={activePreset === 'all' && !selectedPeriod ? 'primary' : 'secondary'}
              onClick={() => handleApplyPreset('all')}
            >
              All Time
            </Button>
            <Button
              size="sm"
              variant={activePreset === 'this_month' && !selectedPeriod ? 'primary' : 'secondary'}
              onClick={() => handleApplyPreset('this_month')}
            >
              This Month
            </Button>
            <Button
              size="sm"
              variant={activePreset === 'last_month' && !selectedPeriod ? 'primary' : 'secondary'}
              onClick={() => handleApplyPreset('last_month')}
            >
              Last Month
            </Button>
            <Button
              size="sm"
              variant={activePreset === 'this_quarter' && !selectedPeriod ? 'primary' : 'secondary'}
              onClick={() => handleApplyPreset('this_quarter')}
            >
              This Quarter
            </Button>
            <Button
              size="sm"
              variant={activePreset === 'this_year' && !selectedPeriod ? 'primary' : 'secondary'}
              onClick={() => handleApplyPreset('this_year')}
            >
              This Year
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
            <Input
              label="From Date"
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />
            <Input
              label="To Date"
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-1.5 h-9"
                onClick={() => fetchVATData(startDate, endDate, selectedPeriod?.id)}
              >
                <Filter className="w-4 h-4" />
                Apply Filter
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-green-500 bg-white shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-sm text-gray-600 font-medium">Output VAT (Sales)</p>
            <Badge status="Approved">15% VAT</Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
            ETB {outputVAT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
            <span>From {invoiceCount} sales invoice{invoiceCount !== 1 ? 's' : ''}</span>
            <span className="text-gray-400 font-mono text-[11px] truncate max-w-[150px]">{activeScopeLabel}</span>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-blue-500 bg-white shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-sm text-gray-600 font-medium">Input VAT (Purchases)</p>
            <Badge status="Pending">Claimable</Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
            ETB {inputVAT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
            <span>From {purchaseCount} cement purchase{purchaseCount !== 1 ? 's' : ''}</span>
            <span className="text-gray-400 font-mono text-[11px] truncate max-w-[150px]">{activeScopeLabel}</span>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-500 bg-white shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-sm text-gray-600 font-medium">Net VAT Payable / (Refundable)</p>
            <Badge status={netPayable >= 0 ? 'Rejected' : 'Approved'}>
              {netPayable >= 0 ? 'Payable' : 'Credit'}
            </Badge>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold mt-2 ${netPayable >= 0 ? 'text-gray-900' : 'text-green-600'}`}>
            ETB {Math.abs(netPayable).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {netPayable < 0 && <span className="text-sm font-normal text-green-600 ml-1">(Credit)</span>}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
            <span>{selectedPeriod ? `Status: ${selectedPeriod.status}` : 'Output VAT − Input VAT'}</span>
            <span className="text-gray-400 font-mono text-[11px] truncate max-w-[150px]">{activeScopeLabel}</span>
          </div>
        </Card>
      </div>

      {/* VAT Periods Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">VAT Filing Periods</h2>
            <p className="text-xs text-gray-500 mt-0.5">Click any period row to inspect its specific invoices and purchases</p>
          </div>
          {selectedPeriod && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedPeriod(null); fetchVATData(startDate, endDate, ''); }}
            >
              Clear Selected Period
            </Button>
          )}
        </div>

        {periods.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-600">
            <p>No VAT periods found.</p>
            <p className="text-sm text-gray-500 mt-1 mb-3">Periods are created automatically, or you can create one manually.</p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateCurrentPeriod}
              disabled={creatingPeriod}
            >
              {creatingPeriod ? 'Creating...' : 'Create Current Month Period'}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-900">Period</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Date Range</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-right">Output VAT (ETB)</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-right">Input VAT (ETB)</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-right">Net VAT (ETB)</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => {
                  const isSelected = selectedPeriod?.id === period.id;
                  return (
                    <tr
                      key={period.id}
                      className={`border-b border-gray-200 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/80 font-medium' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleSelectPeriod(period)}
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2">
                        {isSelected && <ArrowRight className="w-4 h-4 text-blue-600" />}
                        {period.periodName}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {formatDate(period.startDate)} – {formatDate(period.endDate)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900">
                        ETB {period.outputVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900">
                        ETB {period.inputVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        ETB {period.netVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={period.status === 'Filed' ? 'Approved' : period.status === 'Locked' ? 'Rejected' : 'Pending'}>
                          {period.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {period.status === 'Open' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFilePeriod(period);
                            }}
                          >
                            File Period
                          </Button>
                        )}
                        {period.status === 'Filed' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLockPeriod(period);
                            }}
                          >
                            Lock
                          </Button>
                        )}
                        {period.status === 'Locked' && (
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <Lock className="w-4 h-4 text-gray-400" /> Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Transaction Details (Sales Invoices & Cement Purchases) */}
      {(selectedPeriod || startDate || endDate || salesInvoices.length > 0 || cementPurchases.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Transaction Breakdown {isFiltered && <span className="text-sm font-normal text-gray-500">({activeScopeLabel})</span>}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Invoices (Output VAT) */}
            <Card className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-green-50/30">
                <div>
                  <h4 className="font-bold text-gray-900">Sales Invoices ({salesInvoices.length})</h4>
                  <p className="text-xs text-gray-500">Output VAT collected from customers</p>
                </div>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-gray-900">Invoice No</th>
                      <th className="px-4 py-2 font-semibold text-gray-900">Date</th>
                      <th className="px-4 py-2 font-semibold text-gray-900">Customer</th>
                      <th className="px-4 py-2 font-semibold text-gray-900 text-right">Subtotal</th>
                      <th className="px-4 py-2 font-semibold text-gray-900 text-right">VAT (15%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          No sales invoices found for this date range
                        </td>
                      </tr>
                    ) : (
                      salesInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-gray-900">{invoice.invoiceNo}</td>
                          <td className="px-4 py-2.5 text-gray-500">{formatDate(invoice.invoiceDate)}</td>
                          <td className="px-4 py-2.5 text-gray-700 max-w-[120px] truncate">{invoice.customer?.name || '-'}</td>
                          <td className="px-4 py-2.5 text-right text-gray-900">
                            ETB {(invoice.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-green-600">
                            ETB {(invoice.vatAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between font-semibold text-xs sm:text-sm">
                <span className="text-gray-900">Total Output VAT:</span>
                <span className="text-green-600">
                  ETB{' '}
                  {salesInvoices
                    .reduce((sum, inv) => sum + (inv.vatAmount || 0), 0)
                    .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </Card>

            {/* Cement Purchases (Input VAT) */}
            <Card className="overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50/30">
                <div>
                  <h4 className="font-bold text-gray-900">Purchases with VAT ({cementPurchases.length})</h4>
                  <p className="text-xs text-gray-500">Input VAT paid on purchases</p>
                </div>
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-gray-900">Purchase No</th>
                      <th className="px-4 py-2 font-semibold text-gray-900">Date</th>
                      <th className="px-4 py-2 font-semibold text-gray-900">Factory</th>
                      <th className="px-4 py-2 font-semibold text-gray-900 text-right">Total</th>
                      <th className="px-4 py-2 font-semibold text-gray-900 text-right">VAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cementPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          No cement purchases with VAT found for this date range
                        </td>
                      </tr>
                    ) : (
                      cementPurchases.map((purchase) => (
                        <tr key={purchase.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-gray-900">{purchase.purchaseNo}</td>
                          <td className="px-4 py-2.5 text-gray-500">{formatDate(purchase.createdAt)}</td>
                          <td className="px-4 py-2.5 text-gray-700 max-w-[120px] truncate">{purchase.factory?.name || '-'}</td>
                          <td className="px-4 py-2.5 text-right text-gray-900">
                            ETB {(purchase.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-blue-600">
                            ETB {(purchase.vatAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between font-semibold text-xs sm:text-sm">
                <span className="text-gray-900">Total Input VAT:</span>
                <span className="text-blue-600">
                  ETB{' '}
                  {cementPurchases
                    .reduce((sum, p) => sum + (p.vatAmount || 0), 0)
                    .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => {
          setIsConfirmDialogOpen(false);
          setPeriodToFile(null);
        }}
        onConfirm={confirmAction}
        title={actionType === 'file' ? 'File VAT Period' : 'Lock VAT Period'}
        message={
          actionType === 'file'
            ? `Are you sure you want to file the VAT for ${periodToFile?.periodName}? This will submit net VAT of ETB ${periodToFile?.netVat?.toLocaleString('en-US')} to the tax authority.`
            : `Are you sure you want to lock the period ${periodToFile?.periodName}? This cannot be undone.`
        }
        confirmText={actionType === 'file' ? 'File Period' : 'Lock Period'}
        cancelText="Cancel"
      />
    </div>
  );
}
