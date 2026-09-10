'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge, Input, Tabs, Table, Modal, Select } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { Scale, ChevronLeft, Filter, X, ArrowLeft, ExternalLink } from 'lucide-react';

interface WeighbridgeEntry {
  id: string;
  weighbridgeNo: string;
  liftingId: string | null;
  liftingNo: string | null;
  weighbridgeType: string;
  truckPlateNo: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  weighbridgeDate: string;
  operatorName: string | null;
  proofImage: string | null;
  verified: boolean;
  verifiedBy: string | null;
  createdAt: string;
}

interface LiftingOption {
  id: string;
  liftingNo: string;
  factoryWeight: number;
  truckPlateNo: string;
  customerName: string;
  factoryName: string;
  status: string;
  couponNo?: string;
}

interface ApiResponse {
  success: boolean;
  data: WeighbridgeEntry[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function WeighbridgeRegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Weighbridge Register...</div>}>
      <WeighbridgeRegisterContent />
    </Suspense>
  );
}

function WeighbridgeRegisterContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlLiftingId = searchParams.get('liftingId');
  const urlLiftingNo = searchParams.get('liftingNo');
  const initialType = searchParams.get('type')?.toLowerCase();

  const [activeTab, setActiveTab] = useState<string>(
    initialType === 'buyer' ? 'buyer' : urlLiftingId ? 'all' : 'factory'
  );
  const [liftingFilter, setLiftingFilter] = useState<string | null>(urlLiftingId);
  const [liftingNoDisplay, setLiftingNoDisplay] = useState<string | null>(urlLiftingNo);

  const [entries, setEntries] = useState<WeighbridgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [liftings, setLiftings] = useState<LiftingOption[]>([]);
  const [loadingLiftings, setLoadingLiftings] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  const [formData, setFormData] = useState({
    weighbridgeType: 'FACTORY' as 'FACTORY' | 'BUYER',
    liftingId: urlLiftingId || '',
    truckPlateNo: '',
    grossWeight: '',
    tareWeight: '',
    operatorName: '',
  });

  useEffect(() => {
    fetchEntries();
  }, [activeTab, page, pageSize, liftingFilter]);

  useEffect(() => {
    fetchLiftings();
  }, []);

  // If lifting list is loaded and we have liftingFilter without liftingNoDisplay, find it
  useEffect(() => {
    if (liftingFilter && !liftingNoDisplay && liftings.length > 0) {
      const found = liftings.find(l => l.id === liftingFilter);
      if (found) {
        setLiftingNoDisplay(found.liftingNo);
      }
    }
  }, [liftingFilter, liftingNoDisplay, liftings]);

  const fetchLiftings = async () => {
    try {
      setLoadingLiftings(true);
      const res = await fetch('/api/cement/liftings?limit=200');
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setLiftings(
          result.data.map((l: any) => ({
            id: l.id,
            liftingNo: l.liftingNo,
            factoryWeight: Number(l.factoryWeight) || 0,
            truckPlateNo: l.truck?.plateNo || '',
            customerName: l.customer?.companyName || `${l.customer?.firstName || ''} ${l.customer?.lastName || ''}`.trim() || '',
            factoryName: l.factory?.name || l.factory?.factoryName || '',
            status: l.status,
            couponNo: l.coupon?.couponNo || undefined,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch liftings:', err);
    } finally {
      setLoadingLiftings(false);
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      let queryUrl = `/api/cement/weighbridge?page=${page}&limit=${pageSize}`;
      if (activeTab === 'factory') queryUrl += `&weighbridgeType=FACTORY`;
      else if (activeTab === 'buyer') queryUrl += `&weighbridgeType=BUYER`;
      else if (activeTab === 'all') queryUrl += `&weighbridgeType=ALL`;

      if (liftingFilter) {
        queryUrl += `&liftingId=${encodeURIComponent(liftingFilter)}`;
      }

      const response = await fetch(queryUrl);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      setEntries(result.data || []);
      if (result.pagination) {
        setTotalPages(result.pagination.pages || 1);
        setTotalEntries(result.pagination.total || 0);
      } else {
        setTotalPages(1);
        setTotalEntries(result.data?.length || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weighbridge entries');
      setEntries([]);
      setTotalPages(1);
      setTotalEntries(0);
    } finally {
      setLoading(false);
    }
  };

  const clearLiftingFilter = () => {
    setLiftingFilter(null);
    setLiftingNoDisplay(null);
    setActiveTab('factory');
    setPage(1);
    router.replace('/dashboard/cement/weighbridge');
  };

  const openNewEntryModal = (type: 'FACTORY' | 'BUYER' = 'FACTORY') => {
    let initialPlate = '';
    let initialGross = '';
    if (liftingFilter && liftings.length > 0) {
      const match = liftings.find((l) => l.id === liftingFilter);
      if (match) {
        initialPlate = match.truckPlateNo || '';
        if (match.factoryWeight > 0) {
          initialGross = String(match.factoryWeight * 1000);
        }
      }
    }
    setFormData({
      weighbridgeType: type,
      liftingId: liftingFilter || '',
      truckPlateNo: initialPlate,
      grossWeight: initialGross,
      tareWeight: '',
      operatorName: '',
    });
    setShowModal(true);
  };

  const handleAddEntry = async () => {
    if (!formData.truckPlateNo || !formData.grossWeight || !formData.tareWeight) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        weighbridgeType: formData.weighbridgeType,
        liftingId: formData.liftingId || null,
        truckPlateNo: formData.truckPlateNo,
        grossWeight: parseFloat(formData.grossWeight),
        tareWeight: parseFloat(formData.tareWeight),
        ...(formData.operatorName && { operatorName: formData.operatorName }),
      };

      const response = await fetch('/api/cement/weighbridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create entry: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setFormData({ 
          weighbridgeType: 'FACTORY', 
          liftingId: liftingFilter || '', 
          truckPlateNo: '', 
          grossWeight: '', 
          tareWeight: '', 
          operatorName: '' 
        });
        setShowModal(false);
        await fetchEntries();
      } else {
        alert('Failed to add weighbridge entry');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error creating weighbridge entry:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (entryId: string) => {
    if (!confirm('Verify this weighbridge entry? This confirms the weight measurement is correct.')) return;
    try {
      const res = await fetch(`/api/cement/weighbridge/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message || 'Verified successfully');
        fetchEntries();
      } else {
        alert(result.error || 'Failed to verify');
      }
    } catch (err) {
      alert('Error verifying entry');
    }
  };

  const handleDelete = async (entryId: string, weighbridgeNo: string) => {
    if (!confirm(`Are you sure you want to delete weighbridge entry "${weighbridgeNo}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/cement/weighbridge/${entryId}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        alert('Weighbridge entry deleted successfully');
        fetchEntries();
      } else {
        alert(result.error || 'Failed to delete weighbridge entry');
      }
    } catch (err) {
      alert('Error deleting weighbridge entry');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const exportToExcel = () => {
    if (entries.length === 0) {
      alert('No entries to export');
      return;
    }

    const csvHeaders = ['WB No', 'Type', 'Lifting', 'Coupon', 'Truck Plate', 'Gross Weight (kg)', 'Tare Weight (kg)', 'Net Weight (kg)', 'Date', 'Operator', 'Verified'];
    const csvRows = entries.map((entry) => {
      const lifting = entry.liftingId ? liftings.find(l => l.id === entry.liftingId) : null;
      return [
        entry.weighbridgeNo,
        entry.weighbridgeType,
        entry.liftingNo || '',
        lifting?.couponNo || '',
        entry.truckPlateNo,
        entry.grossWeight,
        entry.tareWeight,
        entry.netWeight,
        formatDate(entry.weighbridgeDate),
        entry.operatorName || '',
        entry.verified ? 'Yes' : 'No',
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `weighbridge-${activeTab}-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const averageNetWeight = entries.length > 0
    ? (entries.reduce((sum, e) => sum + (e.netWeight ?? 0), 0) / entries.length).toFixed(2)
    : '0';

  const columns = [
    {
      header: 'WB No',
      accessor: 'weighbridgeNo' as const,
      render: (val: string, row: WeighbridgeEntry) => (
        <Link href={`/dashboard/cement/weighbridge/${row.id}`} className="font-semibold text-[#007AFF] hover:underline flex items-center gap-1">
          {val}
          <ExternalLink className="w-3 h-3 opacity-60" />
        </Link>
      ),
    },
    {
      header: 'Type',
      accessor: 'weighbridgeType' as const,
      render: (val: string) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          val === 'BUYER' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {val}
        </span>
      ),
    },
    {
      header: 'Lifting',
      accessor: 'liftingNo' as const,
      render: (val: string | null, row: WeighbridgeEntry) => val ? (
        row.liftingId ? (
          <Link href={`/dashboard/cement/liftings/${row.liftingId}`} className="text-blue-600 hover:underline font-medium text-xs">
            {val}
          </Link>
        ) : (
          <span className="text-blue-600 font-medium text-xs">{val}</span>
        )
      ) : <span className="text-gray-400">—</span>,
    },
    {
      header: 'Coupon',
      accessor: 'liftingId' as const,
      render: (liftingId: string | null) => {
        if (!liftingId) return <span className="text-gray-400">—</span>;
        const lifting = liftings.find(l => l.id === liftingId);
        const couponNo = lifting?.couponNo;
        return couponNo ? <span className="text-sm font-medium text-purple-600">{couponNo}</span> : <span className="text-gray-400">—</span>;
      },
    },
    { header: 'Truck Plate', accessor: 'truckPlateNo' as const },
    {
      header: 'Gross Weight (kg)',
      accessor: 'grossWeight' as const,
      render: (val: number) => (val ?? 0).toLocaleString('en-US'),
    },
    {
      header: 'Tare Weight (kg)',
      accessor: 'tareWeight' as const,
      render: (val: number) => (val ?? 0).toLocaleString('en-US'),
    },
    {
      header: 'Net Weight (kg)',
      accessor: 'netWeight' as const,
      render: (val: number) => (val ?? 0).toLocaleString('en-US'),
    },
    {
      header: 'Net Weight (Tons)',
      accessor: 'netWeight' as any,
      render: (val: number) => (
        <span className="font-semibold text-slate-900">
          {(val / 1000 > 10 ? val / 1000 : val).toFixed(2)} Tons
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'weighbridgeDate' as const,
      render: (val: string) => formatDate(val),
    },
    {
      header: 'Operator',
      accessor: 'operatorName' as const,
      render: (val: string | null) => val || '-',
    },
    {
      header: 'Verified',
      accessor: 'verified' as const,
      render: (verified: boolean, row: any) => verified ? (
        <div>
          <Badge status="Completed">Verified</Badge>
          {row.verifiedBy && <p className="text-xs text-gray-500 mt-0.5">{row.verifiedBy}</p>}
        </div>
      ) : (
        <button
          onClick={() => handleVerify(row.id)}
          className="px-3 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors cursor-pointer"
        >
          Pending — Verify
        </button>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id' as const,
      render: (_: string, row: WeighbridgeEntry) => (
        <div className="flex items-center gap-1.5">
          <Link href={`/dashboard/cement/weighbridge/${row.id}`}>
            <button
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
              title="View Details"
            >
              View
            </button>
          </Link>
          <Link href={`/dashboard/cement/weighbridge/${row.id}/edit`}>
            <button
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
              title="Edit Entry"
            >
              Edit
            </button>
          </Link>
          <button
            onClick={() => handleDelete(row.id, row.weighbridgeNo)}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
            title="Delete Entry"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const tableContent = (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 pb-1">
        <div className="text-sm text-gray-600 font-medium">
          {loading
            ? 'Loading entries...'
            : `Showing ${entries.length} of ${totalEntries} ${activeTab === 'all' ? 'All' : activeTab === 'factory' ? 'Factory' : 'Buyer'} records`}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium whitespace-nowrap">
            Per page:
          </label>
          <select
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={String(pageSize)}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
            <option value="500">500 per page</option>
            <option value="10000">Show All</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-600">Loading entries...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">Error: {error}</div>
      ) : entries.length === 0 && liftingFilter ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Scale className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-base font-bold text-slate-800">No weighbridge entries linked to Lifting #{liftingNoDisplay || liftingFilter} yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            You can create a new Factory or Buyer weighbridge entry linked directly to this lifting order.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button size="sm" variant="primary" onClick={() => openNewEntryModal('BUYER')}>
              + Record Buyer Weighbridge
            </Button>
            <Button size="sm" variant="secondary" onClick={() => openNewEntryModal('FACTORY')}>
              + Record Factory Weighbridge
            </Button>
          </div>
        </div>
      ) : (
        <Table
          data={entries}
          columns={columns}
          emptyMessage="No entries found"
          pageSize={pageSize >= 10000 ? entries.length : pageSize}
          totalPages={pageSize >= 10000 ? 1 : totalPages}
          currentPage={pageSize >= 10000 ? 1 : page}
          onPageChange={pageSize >= 10000 ? undefined : setPage}
        />
      )}
    </div>
  );

  const tabs = [
    {
      id: 'all',
      label: 'All Records',
      content: tableContent,
    },
    {
      id: 'factory',
      label: 'Factory Weighbridge',
      content: tableContent,
    },
    {
      id: 'buyer',
      label: 'Buyer Weighbridge',
      content: tableContent,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/cement?tab=liftings"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Cement Operations
            </Link>
            {liftingFilter && (
              <>
                <span className="text-slate-400">/</span>
                <Link
                  href={`/dashboard/cement/liftings/${liftingFilter}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Lifting #{liftingNoDisplay || liftingFilter}
                </Link>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-2 flex items-center gap-2.5">
            <Scale className="w-8 h-8 text-[#007AFF]" />
            Weighbridge Register
          </h1>
          <p className="text-gray-600 mt-1">Factory & Buyer weighbridge records and scale tickets</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 flex items-center gap-2 text-sm shadow-xs transition-colors"
          >
            Export Excel
          </button>
          <Button 
            variant="primary" 
            size="lg" 
            onClick={() => openNewEntryModal('FACTORY')}
            className="rounded-xl shadow-xs"
          >
            + New Weighbridge Entry
          </Button>
        </div>
      </div>

      {/* Active Lifting Filter Banner */}
      {liftingFilter && (
        <div className="bg-blue-50/90 border-2 border-blue-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900">
                Filtered by Linked Cement Lifting: <span className="font-mono bg-blue-100 px-2 py-0.5 rounded-md">{liftingNoDisplay || liftingFilter}</span>
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                Showing all weighbridge records linked to this lifting ticket.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/cement/liftings/${liftingFilter}`}>
              <Button size="sm" variant="outline" className="bg-white text-xs">
                View Lifting Details ↗
              </Button>
            </Link>
            <Button size="sm" variant="secondary" onClick={clearLiftingFilter} className="text-xs flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear Filter (Show All)
            </Button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-slate-200/80 shadow-xs">
          <CardBody className="text-center py-6">
            <p className="text-4xl font-bold text-[#007AFF]">
              {totalEntries}
            </p>
            <p className="text-sm text-gray-600 font-medium mt-1">
              Total Entries {liftingFilter ? '(for this lifting)' : `(${activeTab === 'all' ? 'All' : activeTab === 'factory' ? 'Factory' : 'Buyer'})`}
            </p>
          </CardBody>
        </Card>
        <Card className="rounded-2xl border-slate-200/80 shadow-xs">
          <CardBody className="text-center py-6">
            <p className="text-4xl font-bold text-slate-900">
              {Number(averageNetWeight).toLocaleString('en-US')}
            </p>
            <p className="text-sm text-gray-600 font-medium mt-1">
              Avg Net Weight ({Number(averageNetWeight) > 100 ? `${(Number(averageNetWeight)/1000).toFixed(2)} Tons` : 'kg'})
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="rounded-2xl border-slate-200/80 shadow-xs overflow-hidden">
        <CardBody className="p-4 sm:p-6">
          <Tabs
            tabs={tabs}
            defaultTabId={activeTab}
            onChange={(tabId) => {
              setActiveTab(tabId);
              setPage(1);
            }}
          />
        </CardBody>
      </Card>

      {/* New Entry Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFormData({ weighbridgeType: 'FACTORY', liftingId: liftingFilter || '', truckPlateNo: '', grossWeight: '', tareWeight: '', operatorName: '' });
        }}
        title="New Weighbridge Entry"
        body={
          <div className="space-y-4">
            <Select
              label="Type *"
              value={formData.weighbridgeType}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, weighbridgeType: e.target.value as 'FACTORY' | 'BUYER' }))
              }
              options={[
                { label: 'Factory', value: 'FACTORY' },
                { label: 'Buyer', value: 'BUYER' },
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Linked Lifting</label>
              <select
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={formData.liftingId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const lifting = liftings.find((l) => l.id === selectedId);
                  if (lifting) {
                    setFormData((prev) => ({
                      ...prev,
                      liftingId: selectedId,
                      truckPlateNo: lifting.truckPlateNo || prev.truckPlateNo,
                      grossWeight: lifting.factoryWeight > 0 ? String(lifting.factoryWeight) : prev.grossWeight,
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      liftingId: '',
                    }));
                  }
                }}
              >
                <option value="">-- Select Lifting (optional) --</option>
                {liftings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.liftingNo} — {l.factoryWeight} tons — {l.truckPlateNo} — {l.customerName || 'N/A'}{l.couponNo ? ` — Coupon: ${l.couponNo}` : ''} [{l.status}]
                  </option>
                ))}
              </select>
              {loadingLiftings && <p className="text-xs text-gray-400 mt-1">Loading liftings...</p>}
              {formData.liftingId && (() => {
                const sel = liftings.find((l) => l.id === formData.liftingId);
                return sel ? (
                  <div className="mt-2 p-3 rounded-xl border border-blue-200 bg-blue-50/80">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Lifting Details</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-blue-800">
                      <span>Lifting No:</span><span className="font-semibold">{sel.liftingNo}</span>
                      <span>Truck:</span><span className="font-semibold">{sel.truckPlateNo}</span>
                      <span>Factory Weight:</span><span className="font-semibold">{sel.factoryWeight} tons</span>
                      <span>Customer:</span><span className="font-semibold">{sel.customerName || 'N/A'}</span>
                      {sel.factoryName && <><span>Factory:</span><span className="font-semibold">{sel.factoryName}</span></>}
                      {sel.couponNo && <><span>Coupon:</span><span className="font-semibold">{sel.couponNo}</span></>}
                      <span>Status:</span><span className="font-semibold">{sel.status}</span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            <Input
              label="Truck Plate Number *"
              placeholder="e.g., AA-123-AB"
              value={formData.truckPlateNo}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, truckPlateNo: e.target.value }))
              }
            />

            <Input
              label="Gross Weight (kg) *"
              type="number"
              placeholder="Enter gross weight in kg"
              value={formData.grossWeight}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, grossWeight: e.target.value }))
              }
            />

            <Input
              label="Tare Weight (kg) *"
              type="number"
              placeholder="Enter tare weight in kg"
              value={formData.tareWeight}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, tareWeight: e.target.value }))
              }
            />

            {formData.grossWeight && formData.tareWeight && (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
                <p className="text-sm font-bold text-slate-900">
                  Net Weight: {((parseFloat(formData.grossWeight ?? '0') ?? 0) - (parseFloat(formData.tareWeight ?? '0') ?? 0)).toLocaleString('en-US')} kg
                  <span className="text-xs font-normal text-slate-500 ml-2">
                    ({(((parseFloat(formData.grossWeight ?? '0') ?? 0) - (parseFloat(formData.tareWeight ?? '0') ?? 0)) / 1000).toFixed(2)} Tons)
                  </span>
                </p>
              </div>
            )}

            <Input
              label="Operator Name"
              placeholder="Name of weighbridge operator"
              value={formData.operatorName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, operatorName: e.target.value }))
              }
            />
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setFormData({ weighbridgeType: 'FACTORY', liftingId: liftingFilter || '', truckPlateNo: '', grossWeight: '', tareWeight: '', operatorName: '' });
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddEntry} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Entry'}
            </Button>
          </div>
        }
      />
    </div>
  );
}
