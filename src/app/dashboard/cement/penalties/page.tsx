'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge, Input, Select, Table, Modal } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

interface Penalty {
  id: string;
  penaltyNo: string;
  liftingId: string | null;
  transporterId: string | null;
  truckPlateNo: string;
  penaltyType: 'SHORTAGE' | 'DAMAGE' | 'DELAY' | 'OTHER';
  shortageQty: number;
  penaltyRate: number;
  penaltyAmount: number;
  recoveryStatus: 'Pending' | 'Deducted' | 'Recovered' | 'Waived';
  recoveredAmount: number;
  approvedBy: string | null;
  notes: string | null;
  penaltyDate: string;
  createdAt: string;
}

interface LiftingOption {
  id: string;
  liftingNo: string;
  factoryWeight: number;
  truckPlateNo: string;
  customerName: string;
  status: string;
}

interface ApiResponse {
  success: boolean;
  data: Penalty[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function PenaltyAndRecovery() {
  const { t } = useI18n();
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [penaltyTypeFilter, setPenaltyTypeFilter] = useState('');
  const [recoveryStatusFilter, setRecoveryStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Recovery modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<Penalty | null>(null);
  const [recoveryAction, setRecoveryAction] = useState('');
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [recoveryNotes, setRecoveryNotes] = useState('');
  const [updatingRecovery, setUpdatingRecovery] = useState(false);

  // Liftings for dropdown
  const [liftings, setLiftings] = useState<LiftingOption[]>([]);
  const [loadingLiftings, setLoadingLiftings] = useState(false);

  const [formData, setFormData] = useState({
    truckPlateNo: '',
    penaltyType: 'SHORTAGE' as 'SHORTAGE' | 'DAMAGE' | 'DELAY' | 'OTHER',
    shortageQty: '',
    penaltyRate: '2',
    penaltyAmount: '',
    liftingId: '',
    transporterId: '',
    notes: '',
  });

  useEffect(() => {
    fetchPenalties();
  }, [penaltyTypeFilter, recoveryStatusFilter]);

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
            status: l.status,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch liftings:', err);
    } finally {
      setLoadingLiftings(false);
    }
  };

  const fetchPenalties = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (penaltyTypeFilter) params.append('penaltyType', penaltyTypeFilter);
      if (recoveryStatusFilter) params.append('recoveryStatus', recoveryStatusFilter);

      const url = `/api/cement/penalties${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error(`Failed to fetch penalties: ${response.statusText}`);

      const result: ApiResponse = await response.json();
      if (result.success) {
        setPenalties(result.data || []);
      } else {
        setError('Failed to load penalties');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPenalty = async () => {
    if (!formData.truckPlateNo || !formData.shortageQty || !formData.penaltyAmount) {
      alert('Please fill all required fields (Truck Number, Shortage Qty, Penalty Amount)');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        penaltyType: formData.penaltyType,
        truckPlateNo: formData.truckPlateNo,
        shortageQty: parseFloat(formData.shortageQty),
        penaltyRate: parseFloat(formData.penaltyRate || '0'),
        penaltyAmount: parseFloat(formData.penaltyAmount),
        ...(formData.liftingId && { liftingId: formData.liftingId }),
        ...(formData.transporterId && { transporterId: formData.transporterId }),
        ...(formData.notes && { notes: formData.notes }),
      };

      const response = await fetch('/api/cement/penalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Failed to create penalty: ${response.statusText}`);

      const result = await response.json();
      if (result.success) {
        alert('Penalty registered successfully');
        resetForm();
        setShowModal(false);
        await fetchPenalties();
      } else {
        alert('Failed to register penalty');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      truckPlateNo: '', penaltyType: 'SHORTAGE', shortageQty: '', penaltyRate: '2',
      penaltyAmount: '', liftingId: '', transporterId: '', notes: '',
    });
  };

  const openRecoveryModal = (penalty: Penalty, action: string) => {
    setSelectedPenalty(penalty);
    setRecoveryAction(action);
    setRecoveryAmount(action === 'Waived' ? '0' : String(penalty.penaltyAmount));
    setRecoveryNotes('');
    setShowRecoveryModal(true);
  };

  const handleRecoveryUpdate = async () => {
    if (!selectedPenalty || !recoveryAction) return;

    try {
      setUpdatingRecovery(true);
      const res = await fetch(`/api/cement/penalties/${selectedPenalty.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoveryStatus: recoveryAction,
          recoveredAmount: parseFloat(recoveryAmount || '0'),
          ...(recoveryNotes && { notes: (selectedPenalty.notes ? selectedPenalty.notes + ' | ' : '') + recoveryNotes }),
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message || `Updated to ${recoveryAction}`);
        setShowRecoveryModal(false);
        setSelectedPenalty(null);
        await fetchPenalties();
      } else {
        alert(result.error || 'Failed to update');
      }
    } catch (err) {
      alert('Error updating recovery status');
    } finally {
      setUpdatingRecovery(false);
    }
  };

  // Auto-calculate penalty amount when qty and rate change
  const handleQtyOrRateChange = (field: 'shortageQty' | 'penaltyRate', value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      const qty = parseFloat(field === 'shortageQty' ? value : prev.shortageQty) || 0;
      const rate = parseFloat(field === 'penaltyRate' ? value : prev.penaltyRate) || 0;
      updated.penaltyAmount = qty > 0 && rate > 0 ? String(qty * rate) : prev.penaltyAmount;
      return updated;
    });
  };

  const totalPenalties = penalties.reduce((sum, p) => sum + p.penaltyAmount, 0);
  const totalRecovered = penalties.reduce((sum, p) => sum + p.recoveredAmount, 0);
  const totalPending = totalPenalties - totalRecovered;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'SHORTAGE': return <Badge status="Rejected">Shortage</Badge>;
      case 'DAMAGE': return <Badge status="Warning">Damage</Badge>;
      case 'DELAY': return <Badge status="InProgress">Delay</Badge>;
      case 'OTHER': return <Badge status="Pending">Other</Badge>;
      default: return <Badge status="Pending">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Recovered':
      case 'Deducted': return <Badge status="Completed">{status}</Badge>;
      case 'Pending': return <Badge status="Pending">Pending</Badge>;
      case 'Waived': return <Badge status="InProgress">Waived</Badge>;
      default: return <Badge status="Pending">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try { return new Date(dateString).toLocaleDateString(); } catch { return dateString; }
  };

  // Find lifting number for display
  const getLiftingNo = (liftingId: string | null) => {
    if (!liftingId) return null;
    const l = liftings.find((li) => li.id === liftingId);
    return l?.liftingNo || null;
  };

  const columns = [
    { header: 'Penalty No', accessor: 'penaltyNo' as const },
    {
      header: 'Lifting',
      accessor: 'liftingId' as const,
      render: (val: string | null) => {
        const liftNo = getLiftingNo(val);
        return liftNo ? (
          <span className="text-blue-600 font-medium text-xs">{liftNo}</span>
        ) : val ? (
          <span className="text-gray-500 text-xs">{val.slice(0, 8)}...</span>
        ) : <span className="text-gray-400">—</span>;
      },
    },
    { header: 'Truck', accessor: 'truckPlateNo' as const },
    {
      header: 'Type',
      accessor: 'penaltyType' as const,
      render: (type: string) => getTypeBadge(type),
    },
    {
      header: 'Shortage (tons)',
      accessor: 'shortageQty' as const,
      render: (val: number) => (val ?? 0).toLocaleString('en-US'),
    },
    {
      header: 'Penalty (ETB)',
      accessor: 'penaltyAmount' as const,
      render: (val: number) => (val ?? 0).toLocaleString('en-US'),
    },
    {
      header: 'Recovery',
      accessor: 'recoveryStatus' as const,
      render: (status: string, row: any) => (
        <div>
          {getStatusBadge(status)}
          {status === 'Pending' && (
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={() => openRecoveryModal(row, 'Deducted')}
                className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
              >
                Deduct
              </button>
              <button
                onClick={() => openRecoveryModal(row, 'Recovered')}
                className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
              >
                Recover
              </button>
              <button
                onClick={() => openRecoveryModal(row, 'Waived')}
                className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-yellow-100 text-yellow-700 hover:bg-yellow-200 cursor-pointer"
              >
                Waive
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Recovered (ETB)',
      accessor: 'recoveredAmount' as const,
      render: (val: number) => (val ?? 0).toLocaleString('en-US'),
    },
    {
      header: 'Date',
      accessor: 'penaltyDate' as const,
      render: (val: string) => formatDate(val),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/cement" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            &larr; Back to Cement Operations
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Penalty & Recovery Register</h1>
          <p className="text-gray-600 mt-1">Track penalties and recovery status</p>
        </div>
        <Button variant="primary" size="lg" onClick={() => setShowModal(true)}>
          + New Penalty
        </Button>
      </div>

      {error && (
        <Card>
          <CardBody className="text-red-600">
            <p>Error: {error}</p>
            <Button variant="secondary" size="sm" onClick={fetchPenalties} className="mt-2">Retry</Button>
          </CardBody>
        </Card>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardBody className="text-center">
              <p className="text-4xl font-bold" style={{ color: '#FF3B30' }}>
                {(totalPenalties ?? 0).toLocaleString('en-US')}
              </p>
              <p className="text-sm text-gray-600 mt-1">Total Penalties (ETB)</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-4xl font-bold" style={{ color: '#34C759' }}>
                {(totalRecovered ?? 0).toLocaleString('en-US')}
              </p>
              <p className="text-sm text-gray-600 mt-1">Total Recovered (ETB)</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-4xl font-bold" style={{ color: '#FFCC00' }}>
                {(totalPending ?? 0).toLocaleString('en-US')}
              </p>
              <p className="text-sm text-gray-600 mt-1">Total Pending (ETB)</p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Filter by Type"
              value={penaltyTypeFilter}
              onChange={(e) => setPenaltyTypeFilter(e.target.value)}
              options={[
                { label: 'All Types', value: '' },
                { label: 'Shortage', value: 'SHORTAGE' },
                { label: 'Damage', value: 'DAMAGE' },
                { label: 'Delay', value: 'DELAY' },
                { label: 'Other', value: 'OTHER' },
              ]}
            />
            <Select
              label="Filter by Recovery Status"
              value={recoveryStatusFilter}
              onChange={(e) => setRecoveryStatusFilter(e.target.value)}
              options={[
                { label: 'All Status', value: '' },
                { label: 'Pending', value: 'Pending' },
                { label: 'Deducted', value: 'Deducted' },
                { label: 'Recovered', value: 'Recovered' },
                { label: 'Waived', value: 'Waived' },
              ]}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Penalties ({loading ? 'Loading...' : penalties.length})
          </h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-gray-500">Loading penalties...</p>
          ) : (
            <Table data={penalties} columns={columns} emptyMessage="No penalties found" />
          )}
        </CardBody>
      </Card>

      {/* New Penalty Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title="Register New Penalty"
        body={
          <div className="space-y-4">
            {/* Lifting Dropdown */}
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
                    }));
                  } else {
                    setFormData((prev) => ({ ...prev, liftingId: '' }));
                  }
                }}
              >
                <option value="">-- Select Lifting (optional) --</option>
                {liftings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.liftingNo} — {l.factoryWeight} tons — {l.truckPlateNo} — {l.customerName || 'N/A'} [{l.status}]
                  </option>
                ))}
              </select>
              {loadingLiftings && <p className="text-xs text-gray-400 mt-1">Loading liftings...</p>}
            </div>

            <Input
              label="Truck Number *"
              placeholder="e.g., AA-123-AB"
              value={formData.truckPlateNo}
              onChange={(e) => setFormData((prev) => ({ ...prev, truckPlateNo: e.target.value }))}
            />

            <Input
              label="Transporter ID"
              placeholder="e.g., TRANS-001"
              value={formData.transporterId}
              onChange={(e) => setFormData((prev) => ({ ...prev, transporterId: e.target.value }))}
            />

            <Select
              label="Penalty Type *"
              value={formData.penaltyType}
              onChange={(e) => setFormData((prev) => ({ ...prev, penaltyType: e.target.value as any }))}
              options={[
                { label: 'Shortage', value: 'SHORTAGE' },
                { label: 'Damage', value: 'DAMAGE' },
                { label: 'Delay', value: 'DELAY' },
                { label: 'Other', value: 'OTHER' },
              ]}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Shortage Qty (tons) *"
                type="number"
                placeholder="Enter qty"
                value={formData.shortageQty}
                onChange={(e) => handleQtyOrRateChange('shortageQty', e.target.value)}
              />
              <Input
                label="Penalty Rate (ETB/ton)"
                type="number"
                placeholder="Rate"
                value={formData.penaltyRate}
                onChange={(e) => handleQtyOrRateChange('penaltyRate', e.target.value)}
              />
            </div>

            <Input
              label="Penalty Amount (ETB) *"
              type="number"
              placeholder="Auto-calculated or enter manually"
              value={formData.penaltyAmount}
              onChange={(e) => setFormData((prev) => ({ ...prev, penaltyAmount: e.target.value }))}
            />

            <Input
              label="Notes"
              placeholder="Additional notes about the penalty"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }} disabled={submitting}>Cancel</Button>
            <Button variant="primary" onClick={handleAddPenalty} disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Penalty'}
            </Button>
          </div>
        }
      />

      {/* Recovery Status Modal */}
      <Modal
        isOpen={showRecoveryModal}
        onClose={() => { setShowRecoveryModal(false); setSelectedPenalty(null); }}
        title={`Update Recovery — ${recoveryAction}`}
        body={
          selectedPenalty ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-600">Penalty No:</span>
                  <span className="font-medium">{selectedPenalty.penaltyNo}</span>
                  <span className="text-gray-600">Truck:</span>
                  <span className="font-medium">{selectedPenalty.truckPlateNo}</span>
                  <span className="text-gray-600">Penalty Amount:</span>
                  <span className="font-bold text-red-600">ETB {selectedPenalty.penaltyAmount.toLocaleString('en-US')}</span>
                </div>
              </div>

              {recoveryAction !== 'Waived' && (
                <Input
                  label={`${recoveryAction === 'Deducted' ? 'Deducted' : 'Recovered'} Amount (ETB)`}
                  type="number"
                  value={recoveryAmount}
                  onChange={(e) => setRecoveryAmount(e.target.value)}
                />
              )}

              <Input
                label="Notes (optional)"
                placeholder="Add a note about this recovery action"
                value={recoveryNotes}
                onChange={(e) => setRecoveryNotes(e.target.value)}
              />

              {recoveryAction === 'Waived' && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    Waiving this penalty means the amount will not be recovered. The recovered amount will be set to 0.
                  </p>
                </div>
              )}
            </div>
          ) : null
        }
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowRecoveryModal(false); setSelectedPenalty(null); }} disabled={updatingRecovery}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRecoveryUpdate}
              disabled={updatingRecovery}
              className={recoveryAction === 'Waived' ? 'bg-yellow-600 hover:bg-yellow-700' : recoveryAction === 'Deducted' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              {updatingRecovery ? 'Updating...' : `Confirm ${recoveryAction}`}
            </Button>
          </div>
        }
      />
    </div>
  );
}
