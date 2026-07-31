'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge, Input, Tabs, Table, Modal, Select } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

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

export default function WeighbridgeRegister() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<string>('factory');
  const [entries, setEntries] = useState<WeighbridgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [liftings, setLiftings] = useState<LiftingOption[]>([]);
  const [loadingLiftings, setLoadingLiftings] = useState(false);

  const [formData, setFormData] = useState({
    weighbridgeType: 'FACTORY' as 'FACTORY' | 'BUYER',
    liftingId: '',
    truckPlateNo: '',
    grossWeight: '',
    tareWeight: '',
    operatorName: '',
  });

  useEffect(() => {
    fetchEntries();
  }, [activeTab]);

  useEffect(() => {
    fetchLiftings();
  }, []);

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
      const typeParam = activeTab === 'factory' ? 'FACTORY' : 'BUYER';
      const response = await fetch(`/api/cement/weighbridge?weighbridgeType=${typeParam}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      setEntries(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weighbridge entries');
      setEntries([]);
    } finally {
      setLoading(false);
    }
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
        setFormData({ weighbridgeType: 'FACTORY', liftingId: '', truckPlateNo: '', grossWeight: '', tareWeight: '', operatorName: '' });
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

    const csvHeaders = ['WB No', 'Lifting', 'Coupon', 'Truck Plate', 'Gross Weight (kg)', 'Tare Weight (kg)', 'Net Weight (kg)', 'Date', 'Operator', 'Verified'];
    const csvRows = entries.map((entry) => {
      const lifting = entry.liftingId ? liftings.find(l => l.id === entry.liftingId) : null;
      return [
        entry.weighbridgeNo,
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
    { header: 'WB No', accessor: 'weighbridgeNo' as const },
    {
      header: 'Lifting',
      accessor: 'liftingNo' as const,
      render: (val: string | null) => val ? <span className="text-blue-600 font-medium text-xs">{val}</span> : <span className="text-gray-400">—</span>,
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
          Pending — Click to Verify
        </button>
      ),
    },
  ];

  const tableContent = loading ? (
    <div className="text-center py-8 text-gray-600">Loading entries...</div>
  ) : error ? (
    <div className="text-center py-8 text-red-600">Error: {error}</div>
  ) : (
    <Table data={entries} columns={columns} emptyMessage="No entries found" />
  );

  const tabs = [
    {
      id: 'factory',
      label: 'Factory',
      content: tableContent,
    },
    {
      id: 'buyer',
      label: 'Buyer',
      content: tableContent,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/cement"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            &larr; Back to Cement Operations
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Weighbridge Register</h1>
          <p className="text-gray-600 mt-1">Factory & Buyer weighbridge records</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 flex items-center gap-2 text-sm"
          >
            Export Excel
          </button>
          <Button variant="primary" size="lg" onClick={() => setShowModal(true)}>
            + New Entry
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardBody className="text-center">
            <p className="text-4xl font-bold" style={{ color: '#007AFF' }}>
              {entries.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total Entries ({activeTab === 'factory' ? 'Factory' : 'Buyer'})</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-4xl font-bold" style={{ color: '#007AFF' }}>
              {averageNetWeight}
            </p>
            <p className="text-sm text-gray-600 mt-1">Avg Net Weight (kg)</p>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardBody>
          <Tabs tabs={tabs} defaultTabId="factory" onChange={setActiveTab} />
        </CardBody>
      </Card>

      {/* New Entry Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFormData({ weighbridgeType: 'FACTORY', liftingId: '', truckPlateNo: '', grossWeight: '', tareWeight: '', operatorName: '' });
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.liftingId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const lifting = liftings.find((l) => l.id === selectedId);
                  if (lifting) {
                    setFormData((prev) => ({
                      ...prev,
                      liftingId: selectedId,
                      truckPlateNo: lifting.truckPlateNo || prev.truckPlateNo,
                      // For FACTORY type: pre-fill gross with factory weight (driver can adjust)
                      // For BUYER type: pre-fill gross with factory weight as reference
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
                  <div className="mt-2 p-3 rounded-lg border border-blue-200" style={{ backgroundColor: '#EFF6FF' }}>
                    <p className="text-xs font-semibold text-blue-800 mb-1">Lifting Details</p>
                    <div className="grid grid-cols-2 gap-1 text-xs text-blue-700">
                      <span>Lifting No:</span><span className="font-medium">{sel.liftingNo}</span>
                      <span>Truck:</span><span className="font-medium">{sel.truckPlateNo}</span>
                      <span>Factory Weight:</span><span className="font-medium">{sel.factoryWeight} tons</span>
                      <span>Customer:</span><span className="font-medium">{sel.customerName || 'N/A'}</span>
                      {sel.factoryName && <><span>Factory:</span><span className="font-medium">{sel.factoryName}</span></>}
                      {sel.couponNo && <><span>Coupon:</span><span className="font-medium">{sel.couponNo}</span></>}
                      <span>Status:</span><span className="font-medium">{sel.status}</span>
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
              placeholder="Enter gross weight"
              value={formData.grossWeight}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, grossWeight: e.target.value }))
              }
            />

            <Input
              label="Tare Weight (kg) *"
              type="number"
              placeholder="Enter tare weight"
              value={formData.tareWeight}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, tareWeight: e.target.value }))
              }
            />

            {formData.grossWeight && formData.tareWeight && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#F5F5F7' }}>
                <p className="text-sm font-semibold text-gray-900">
                  Net Weight: {((parseFloat(formData.grossWeight ?? '0') ?? 0) - (parseFloat(formData.tareWeight ?? '0') ?? 0)).toLocaleString('en-US')} kg
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
                setFormData({ weighbridgeType: 'FACTORY', liftingId: '', truckPlateNo: '', grossWeight: '', tareWeight: '', operatorName: '' });
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
