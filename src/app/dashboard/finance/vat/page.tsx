'use client';

import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card, { CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
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

export default function VATManagementPage() {
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
  const [viewMode, setViewMode] = useState<'periods' | 'overall'>('overall');

  useEffect(() => {
    fetchVATData();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPeriodDetails(selectedPeriod.id);
    }
  }, [selectedPeriod?.id]);

  const fetchVATData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/finance/vat');

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        const periodsData = result.data?.periods || [];
        const summaryData = result.data?.summary || null;
        setPeriods(periodsData);
        setSummary(summaryData);
      } else {
        setError('Failed to load VAT data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch VAT data');
    } finally {
      setLoading(false);
    }
  };

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
        // Refresh periods
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
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

      const response = await fetch('/api/finance/vat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodName, startDate, endDate }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchVATData();
      } else {
        // Period might already exist (auto-created), just refresh
        await fetchVATData();
      }
    } catch (err) {
      console.error('Error creating period:', err);
      await fetchVATData();
    } finally {
      setCreatingPeriod(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">VAT Management</h1>
          <p className="text-gray-600 mt-1">Manage VAT periods and filings (Ethiopian VAT Rate: {VAT_RATE}%)</p>
        </div>
        <Card>
          <CardBody>
            <p className="text-center text-gray-600 py-8">Loading VAT data...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error) {
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
              <Button variant="outline" onClick={fetchVATData}>Retry</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Display summary totals when viewing overall, otherwise use selected period
  const showOverall = viewMode === 'overall' || !selectedPeriod;
  const outputVAT = showOverall ? (summary?.totalOutputVat || 0) : (selectedPeriod?.outputVat || 0);
  const inputVAT = showOverall ? (summary?.totalInputVat || 0) : (selectedPeriod?.inputVat || 0);
  const netPayable = showOverall ? (summary?.netVatPayable || 0) : (selectedPeriod?.netVat || 0);
  const invoiceCount = showOverall ? (summary?.salesInvoicesCount || 0) : salesInvoices.length;
  const purchaseCount = showOverall ? (summary?.cementPurchasesCount || 0) : cementPurchases.length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">VAT Management</h1>
          <p className="text-gray-600 mt-1">Manage VAT periods and filings (Ethiopian VAT Rate: {VAT_RATE}%)</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'overall' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => { setViewMode('overall'); setSelectedPeriod(null); }}
          >
            Overall Totals
          </Button>
          <Button
            variant={viewMode === 'periods' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setViewMode('periods');
              if (periods.length > 0 && !selectedPeriod) setSelectedPeriod(periods[0]);
            }}
          >
            By Period
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-l-4 border-l-green-500">
          <p className="text-sm text-gray-600 font-medium">
            Output VAT {!showOverall && selectedPeriod ? `(${selectedPeriod.periodName})` : '(All Time)'}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ETB {outputVAT.toLocaleString('en-US')}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            From {invoiceCount} sales invoice{invoiceCount !== 1 ? 's' : ''}
          </p>
        </Card>

        <Card className="p-6 border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-600 font-medium">
            Input VAT {!showOverall && selectedPeriod ? `(${selectedPeriod.periodName})` : '(All Time)'}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ETB {inputVAT.toLocaleString('en-US')}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            From {purchaseCount} cement purchase{purchaseCount !== 1 ? 's' : ''} with VAT
          </p>
        </Card>

        <Card className="p-6 border-l-4 border-l-red-500">
          <p className="text-sm text-gray-600 font-medium">Net VAT Payable</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            ETB {netPayable.toLocaleString('en-US')}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {showOverall ? 'Across all periods' : selectedPeriod?.status === 'Open' ? 'Not yet filed' : selectedPeriod?.status || '-'}
          </p>
        </Card>
      </div>

      {/* VAT Periods Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">VAT Periods</h2>
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
                  <th className="px-6 py-3 font-semibold text-gray-900 text-right">Output VAT (ETB)</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-right">Input VAT (ETB)</th>
                  <th className="px-6 py-3 font-semibold text-gray-900 text-right">Net VAT (ETB)</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr
                    key={period.id}
                    className={`border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                      selectedPeriod?.id === period.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => { setSelectedPeriod(period); setViewMode('periods'); }}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{period.periodName}</td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      ETB {period.outputVat.toLocaleString('en-US')}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      ETB {period.inputVat.toLocaleString('en-US')}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ETB {period.netVat.toLocaleString('en-US')}
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
                          <Lock className="w-4 h-4" /> Locked
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

      {/* Current Period Details */}
      {selectedPeriod && viewMode === 'periods' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Invoices */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Sales Invoices ({salesInvoices.length})</h3>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 font-semibold text-gray-900">Invoice</th>
                    <th className="px-4 py-2 font-semibold text-gray-900">Customer</th>
                    <th className="px-4 py-2 font-semibold text-gray-900 text-right">Amount</th>
                    <th className="px-4 py-2 font-semibold text-gray-900 text-right">VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {salesInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-gray-500">No sales invoices for this period</td>
                    </tr>
                  ) : (
                    salesInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{invoice.invoiceNo}</td>
                        <td className="px-4 py-2 text-gray-600">{invoice.customer?.name || '-'}</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          ETB {(invoice.subtotal || 0).toLocaleString('en-US')}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-green-600">
                          ETB {(invoice.vatAmount || 0).toLocaleString('en-US')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between font-semibold">
              <span className="text-gray-900">Total Output VAT:</span>
              <span className="text-green-600">
                ETB{' '}
                {salesInvoices
                  .reduce((sum, inv) => sum + (inv.vatAmount || 0), 0)
                  .toLocaleString('en-US')}
              </span>
            </div>
          </Card>

          {/* Cement Purchases (Input VAT) */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Purchases with VAT ({cementPurchases.length})</h3>
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 font-semibold text-gray-900">Purchase</th>
                    <th className="px-4 py-2 font-semibold text-gray-900">Factory</th>
                    <th className="px-4 py-2 font-semibold text-gray-900 text-right">Total</th>
                    <th className="px-4 py-2 font-semibold text-gray-900 text-right">VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {cementPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-gray-500">No purchases with VAT for this period</td>
                    </tr>
                  ) : (
                    cementPurchases.map((purchase) => (
                      <tr key={purchase.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{purchase.purchaseNo}</td>
                        <td className="px-4 py-2 text-gray-600">{purchase.factory?.name || '-'}</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          ETB {(purchase.totalAmount || 0).toLocaleString('en-US')}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-blue-600">
                          ETB {(purchase.vatAmount || 0).toLocaleString('en-US')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between font-semibold">
              <span className="text-gray-900">Total Input VAT:</span>
              <span className="text-blue-600">
                ETB{' '}
                {cementPurchases
                  .reduce((sum, p) => sum + (p.vatAmount || 0), 0)
                  .toLocaleString('en-US')}
              </span>
            </div>
          </Card>
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
