'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Layers,
  FileText,
  X,
} from 'lucide-react';
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
  startDate?: string | null;
  endDate?: string | null;
}

type PresetOption = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all' | 'custom';

function getPresetDateRange(preset: PresetOption): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  if (preset === 'this_month') {
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const to = new Date(year, month + 1, 0).toISOString().split('T')[0];
    return { from, to };
  } else if (preset === 'last_month') {
    const lastMonthDate = new Date(year, month - 1, 1);
    const lmYear = lastMonthDate.getFullYear();
    const lmMonth = lastMonthDate.getMonth();
    const from = `${lmYear}-${String(lmMonth + 1).padStart(2, '0')}-01`;
    const to = new Date(lmYear, lmMonth + 1, 0).toISOString().split('T')[0];
    return { from, to };
  } else if (preset === 'this_quarter') {
    const qMonth = Math.floor(month / 3) * 3;
    const from = `${year}-${String(qMonth + 1).padStart(2, '0')}-01`;
    const to = new Date(year, qMonth + 3, 0).toISOString().split('T')[0];
    return { from, to };
  } else if (preset === 'this_year') {
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    return { from, to };
  } else {
    return { from: '', to: '' };
  }
}

export default function VATManagementPage() {
  const defaultDates = getPresetDateRange('this_month');
  const [startDate, setStartDate] = useState(defaultDates.from);
  const [endDate, setEndDate] = useState(defaultDates.to);
  const [activePreset, setActivePreset] = useState<PresetOption>('this_month');

  const [periods, setPeriods] = useState<VATPeriod[]>([]);
  const [summary, setSummary] = useState<VATSummary | null>(null);
  const [salesInvoices, setSalesInvoices] = useState<VATInvoice[]>([]);
  const [cementPurchases, setCementPurchases] = useState<CementPurchaseVat[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<VATPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [periodToFile, setPeriodToFile] = useState<VATPeriod | null>(null);
  const [actionType, setActionType] = useState<'file' | 'lock'>('file');
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [viewMode, setViewMode] = useState<'overall' | 'periods'>('overall');

  const fetchVATData = useCallback(async (from?: string, to?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      const sDate = from !== undefined ? from : startDate;
      const eDate = to !== undefined ? to : endDate;

      if (sDate) params.append('startDate', sDate);
      if (eDate) params.append('endDate', eDate);

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/finance/vat${queryStr}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        const periodsData = result.data?.periods || [];
        const summaryData = result.data?.summary || null;
        setPeriods(periodsData);
        setSummary(summaryData);

        // If in overall/date-filtered mode or no specific period is selected, load the date-filtered transactions
        if (!selectedPeriod) {
          setSalesInvoices(result.data?.salesInvoices || []);
          setCementPurchases(result.data?.cementPurchases || []);
        }
      } else {
        setError('Failed to load VAT data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch VAT data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedPeriod]);

  useEffect(() => {
    fetchVATData();
  }, [fetchVATData]);

  useEffect(() => {
    if (selectedPeriod && viewMode === 'periods') {
      fetchPeriodDetails(selectedPeriod.id);
    }
  }, [selectedPeriod?.id, viewMode]);

  const fetchPeriodDetails = async (periodId: string) => {
    try {
      const response = await fetch(`/api/finance/vat?periodId=${periodId}`);
      if (!response.ok) return;

      const result = await response.json();
      if (result.success) {
        setSalesInvoices(result.data?.salesInvoices || []);
        setCementPurchases(result.data?.cementPurchases || []);
      }
    } catch (err) {
      console.error('Error fetching period details:', err);
    }
  };

  const handleApplyPreset = (preset: PresetOption) => {
    setActivePreset(preset);
    const range = getPresetDateRange(preset);
    setStartDate(range.from);
    setEndDate(range.to);
    fetchVATData(range.from, range.to);
  };

  const handleCustomDateChange = (fromVal: string, toVal: string) => {
    setActivePreset('custom');
    setStartDate(fromVal);
    setEndDate(toVal);
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
        await fetchVATData();
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
      const periodStart = new Date(year, month, 1).toISOString();
      const periodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

      const response = await fetch('/api/finance/vat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodName, startDate: periodStart, endDate: periodEnd }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchVATData();
      } else {
        await fetchVATData();
      }
    } catch (err) {
      console.error('Error creating period:', err);
      await fetchVATData();
    } finally {
      setCreatingPeriod(false);
    }
  };

  const handleExportVAT = () => {
    const dateLabel = startDate && endDate ? `${startDate}_to_${endDate}` : 'all_time';
    const csvContent = [
      ['VAT Report - Samaria ERP'],
      [`Date Range: ${startDate || 'All Time'} to ${endDate || 'All Time'}`],
      [`Ethiopian VAT Rate: ${VAT_RATE}%`],
      [''],
      ['--- SUMMARY ---'],
      ['Metric', 'Amount (ETB)', 'Count'],
      ['Total Output VAT (Sales Invoices)', (outputVAT || 0).toFixed(2), invoiceCount.toString()],
      ['Total Input VAT (Cement Purchases)', (inputVAT || 0).toFixed(2), purchaseCount.toString()],
      ['Net VAT Payable', (netPayable || 0).toFixed(2), ''],
      [''],
      ['--- SALES INVOICES (OUTPUT VAT) ---'],
      ['Invoice No', 'Invoice Date', 'Customer', 'Subtotal (ETB)', 'VAT (15%)', 'Total (ETB)'],
      ...salesInvoices.map((inv) => [
        inv.invoiceNo,
        inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '',
        inv.customer?.name ? `"${inv.customer.name.replace(/"/g, '""')}"` : 'N/A',
        (inv.subtotal || 0).toFixed(2),
        (inv.vatAmount || 0).toFixed(2),
        (inv.totalAmount || 0).toFixed(2),
      ]),
      [''],
      ['--- PURCHASES WITH VAT (INPUT VAT) ---'],
      ['Purchase No', 'Date', 'Factory', 'Total (ETB)', 'VAT Rate (%)', 'VAT Amount (ETB)'],
      ...cementPurchases.map((p) => [
        p.purchaseNo,
        p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
        p.factory?.name ? `"${p.factory.name.replace(/"/g, '""')}"` : 'N/A',
        (p.totalAmount || 0).toFixed(2),
        (p.vatRate || VAT_RATE).toString(),
        (p.vatAmount || 0).toFixed(2),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vat-report-${dateLabel}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Display summary totals when viewing overall/filtered range, otherwise use selected period
  const showOverall = viewMode === 'overall' || !selectedPeriod;
  const outputVAT = showOverall ? summary?.totalOutputVat || 0 : selectedPeriod?.outputVat || 0;
  const inputVAT = showOverall ? summary?.totalInputVat || 0 : selectedPeriod?.inputVat || 0;
  const netPayable = showOverall ? summary?.netVatPayable || 0 : selectedPeriod?.netVat || 0;
  const invoiceCount = showOverall ? summary?.salesInvoicesCount || 0 : salesInvoices.length;
  const purchaseCount = showOverall ? summary?.cementPurchasesCount || 0 : cementPurchases.length;

  const dateFilterLabel =
    startDate && endDate
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : startDate
      ? `From ${formatDate(startDate)}`
      : endDate
      ? `Until ${formatDate(endDate)}`
      : 'All Time';

  if (loading && !summary && periods.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">VAT Management</h1>
          <p className="text-gray-600 mt-1">Manage VAT periods and filings (Ethiopian VAT Rate: {VAT_RATE}%)</p>
        </div>
        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-gray-600 font-medium">Loading VAT data...</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error && !summary && periods.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">VAT Management</h1>
          <p className="text-gray-600 mt-1">Manage VAT periods and filings (Ethiopian VAT Rate: {VAT_RATE}%)</p>
        </div>
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <p className="text-red-600 font-semibold mb-4">Error: {error}</p>
              <Button variant="outline" onClick={() => fetchVATData()}>
                Retry
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">VAT Management</h1>
          <p className="text-gray-600 mt-1">
            Track Output VAT from Sales & Input VAT from Purchases (Ethiopian VAT Rate: {VAT_RATE}%)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportVAT}
          >
            Export VAT CSV
          </Button>
          <Button
            variant={viewMode === 'overall' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setViewMode('overall');
              setSelectedPeriod(null);
              fetchVATData();
            }}
          >
            Date Filter View
          </Button>
          <Button
            variant={viewMode === 'periods' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setViewMode('periods');
              if (periods.length > 0 && !selectedPeriod) {
                setSelectedPeriod(periods[0]);
              }
            }}
          >
            Monthly Periods
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <Card className="p-4 sm:p-5 shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Date Filter:
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset('this_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activePreset === 'this_month'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('last_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activePreset === 'last_month'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('this_quarter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activePreset === 'this_quarter'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Quarter
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('this_year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activePreset === 'this_year'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Year
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activePreset === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Date Picker Range Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-36 sm:w-40">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                title="Start Date"
              />
            </div>
            <span className="text-gray-400 text-xs font-medium">to</span>
            <div className="w-36 sm:w-40">
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                title="End Date"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={() => fetchVATData(startDate, endDate)}
            >
              Apply
            </Button>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                title="Clear date filter"
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-5 sm:p-6 border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Output VAT (Sales)
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                ETB {(outputVAT || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <Badge status="Approved">{invoiceCount} Invoices</Badge>
          </div>
          <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-green-600" />
            {showOverall ? dateFilterLabel : `Period: ${selectedPeriod?.periodName}`}
          </p>
        </Card>

        <Card className="p-5 sm:p-6 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Input VAT (Purchases)
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                ETB {(inputVAT || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <Badge status="Info">{purchaseCount} Purchases</Badge>
          </div>
          <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            {showOverall ? dateFilterLabel : `Period: ${selectedPeriod?.periodName}`}
          </p>
        </Card>

        <Card className="p-5 sm:p-6 border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Net VAT Payable
              </p>
              <p className={`text-2xl sm:text-3xl font-bold mt-2 ${netPayable >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                ETB {(netPayable || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <Badge status={netPayable >= 0 ? 'Warning' : 'Approved'}>
              {netPayable >= 0 ? 'To Pay' : 'Refundable'}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-red-500" />
            {showOverall
              ? 'Output VAT minus Input VAT'
              : selectedPeriod?.status === 'Open'
              ? 'Not yet filed'
              : selectedPeriod?.status || '-'}
          </p>
        </Card>
      </div>

      {/* Content Section: Monthly Periods (if in Periods Mode) */}
      {viewMode === 'periods' && (
        <Card className="overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Monthly VAT Periods</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Select a period below to view its specific sales invoices and purchases
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateCurrentPeriod}
              disabled={creatingPeriod}
            >
              {creatingPeriod ? 'Creating...' : '+ Create Current Month Period'}
            </Button>
          </div>

          {periods.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-600">
              <p>No VAT periods found.</p>
              <p className="text-sm text-gray-500 mt-1 mb-3">
                Periods are created automatically, or you can create one manually.
              </p>
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
                    <th className="px-6 py-3 font-semibold text-gray-900 text-right">Output VAT (ETB)</th>
                    <th className="px-6 py-3 font-semibold text-gray-900 text-right">Input VAT (ETB)</th>
                    <th className="px-6 py-3 font-semibold text-gray-900 text-right">Net VAT (ETB)</th>
                    <th className="px-6 py-3 font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 font-semibold text-gray-900 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {periods.map((period) => (
                    <tr
                      key={period.id}
                      className={`cursor-pointer transition-colors hover:bg-blue-50/60 ${
                        selectedPeriod?.id === period.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                      }`}
                      onClick={() => {
                        setSelectedPeriod(period);
                        fetchPeriodDetails(period.id);
                      }}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span>{period.periodName}</span>
                          {selectedPeriod?.id === period.id && (
                            <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                              Viewing
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 font-medium">
                        ETB {(period.outputVat || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 font-medium">
                        ETB {(period.inputVat || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        ETB {(period.netVat || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          status={
                            period.status === 'Filed'
                              ? 'Approved'
                              : period.status === 'Locked'
                              ? 'Rejected'
                              : 'Pending'
                          }
                        >
                          {period.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
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
                          <span className="text-xs text-gray-500 inline-flex items-center gap-1 justify-end">
                            <Lock className="w-3.5 h-3.5 text-gray-400" /> Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Transaction Details (Visible in Date Filter mode OR when a period is selected) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">
              {viewMode === 'periods' && selectedPeriod
                ? `Transactions for Period: ${selectedPeriod.periodName}`
                : `Transactions for Selected Range (${dateFilterLabel})`}
            </h2>
          </div>
          <span className="text-xs text-gray-500">
            {salesInvoices.length} Sales &bull; {cementPurchases.length} Purchases
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Invoices (Output VAT) */}
          <Card className="overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-green-50/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Sales Invoices ({salesInvoices.length})
                </h3>
              </div>
              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                Output VAT
              </span>
            </div>

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-gray-900">Invoice #</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-900">Date</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-900">Customer</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-900 text-right">Subtotal</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-900 text-right">VAT (15%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salesInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No sales invoices found for this date range.
                      </td>
                    </tr>
                  ) : (
                    salesInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{invoice.invoiceNo}</td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                          {invoice.invoiceDate ? formatDate(invoice.invoiceDate) : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 max-w-[150px] truncate">
                          {invoice.customer?.name || '-'}
                        </td>
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

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-between font-semibold text-sm">
              <span className="text-gray-900">Total Output VAT:</span>
              <span className="text-green-600 font-bold">
                ETB{' '}
                {salesInvoices
                  .reduce((sum, inv) => sum + (inv.vatAmount || 0), 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </Card>

          {/* Cement Purchases (Input VAT) */}
          <Card className="overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Purchases with VAT ({cementPurchases.length})
                </h3>
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                Input VAT
              </span>
            </div>

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-gray-900">Purchase #</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-900">Date</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-900">Factory</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-900 text-right">Total</th>
                    <th className="px-4 py-2.5 font-semibold text-gray-900 text-right">VAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cementPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No purchases with VAT found for this date range.
                      </td>
                    </tr>
                  ) : (
                    cementPurchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{purchase.purchaseNo}</td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                          {purchase.createdAt ? formatDate(purchase.createdAt) : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 max-w-[150px] truncate">
                          {purchase.factory?.name || '-'}
                        </td>
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

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-between font-semibold text-sm">
              <span className="text-gray-900">Total Input VAT:</span>
              <span className="text-blue-600 font-bold">
                ETB{' '}
                {cementPurchases
                  .reduce((sum, p) => sum + (p.vatAmount || 0), 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </Card>
        </div>
      </div>

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
            ? `Are you sure you want to file the VAT for ${periodToFile?.periodName}? This will submit net VAT of ETB ${(periodToFile?.netVat || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to the tax authority.`
            : `Are you sure you want to lock the period ${periodToFile?.periodName}? This cannot be undone.`
        }
        confirmText={actionType === 'file' ? 'File Period' : 'Lock Period'}
        cancelText="Cancel"
      />
    </div>
  );
}
