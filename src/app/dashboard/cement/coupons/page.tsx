'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button, Badge, Tabs, Table, Modal, Input, FileUpload } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

interface CementLifting {
  id: string;
  liftingNo: string;
  factoryWeight: number;
  liftingDate: string;
  purchase?: {
    orderNo: string;
    supplierId?: string;
  };
  factory?: {
    name: string;
  };
  status?: string;
}

interface Coupon {
  id: string;
  couponNo: string;
  factory: string;
  purchaseNo: string;
  tonnage: number;
  status: 'InCustody' | 'HandedOver' | 'Used';
  collectedDate: string;
  handedTo?: string;
  handoverDate?: string;
}

export default function CouponManagement() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handoverData, setHandoverData] = useState({
    receiverName: '',
    handoverDate: '',
    proofFile: null as File | null,
  });

  // Register coupon form state
  const [registerData, setRegisterData] = useState({
    couponNo: '',
    factoryId: '',
    purchaseId: '',
    tonnage: '',
    collectionDate: '',
  });
  const [factories, setFactories] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [cementPurchases, setCementPurchases] = useState<Array<{ id: string; purchaseNo: string; factory?: { name: string }; cementType?: string; status: string }>>([]);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    fetchCoupons();

    // Fetch factories and purchase orders for registration
    fetch('/api/factories?limit=1000')
      .then((res) => res.json())
      .then((data) => { if (data.success) setFactories(data.data || []); })
      .catch(console.error);

    fetch('/api/cement/purchases?limit=1000')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Only show Active purchases (approved AND paid) for coupon registration
          const filtered = (data.data || []).filter(
            (p: any) => p.status === 'Active'
          );
          setCementPurchases(filtered);
        }
      })
      .catch(console.error);
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/cement/coupons?limit=100');
      const data = await response.json();

      if (data.success && data.data) {
        const transformedCoupons: Coupon[] = data.data.map((coupon: any) => ({
          id: coupon.id,
          couponNo: coupon.couponNo,
          factory: coupon.factory?.name || 'Unknown Factory',
          purchaseNo: coupon.purchase?.purchaseNo || '-',
          tonnage: coupon.tonnage || 0,
          status: coupon.status === 'USED' ? 'Used' : coupon.status === 'HANDED_OVER' ? 'HandedOver' : 'InCustody',
          collectedDate: coupon.collectedDate ? new Date(coupon.collectedDate).toISOString().split('T')[0] : '-',
          handedTo: coupon.handedTo || undefined,
          handoverDate: coupon.handoverDate ? new Date(coupon.handoverDate).toISOString().split('T')[0] : undefined,
        }));
        setCoupons(transformedCoupons);
      } else {
        setCoupons([]);
      }
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setError('Error fetching coupon data');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'InCustody':
        return <Badge status="InProgress">In Custody</Badge>;
      case 'HandedOver':
        return <Badge status="Approved">Handed Over</Badge>;
      case 'Used':
        return <Badge status="Completed">Used</Badge>;
      default:
        return <Badge status="Pending">{status}</Badge>;
    }
  };

  const filteredCoupons = coupons.filter((coupon) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'custody') return coupon.status === 'InCustody';
    if (activeTab === 'handed') return coupon.status === 'HandedOver';
    if (activeTab === 'used') return coupon.status === 'Used';
    return true;
  });

  const handleHandoverClick = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setShowHandoverModal(true);
  };

  const handleHandoverSubmit = async () => {
    if (!selectedCoupon || !handoverData.receiverName || !handoverData.handoverDate) {
      alert('Please fill all required fields');
      return;
    }
    // Simulate API call
    setTimeout(() => {
      setShowHandoverModal(false);
      setSelectedCoupon(null);
      setHandoverData({ receiverName: '', handoverDate: '', proofFile: null });
    }, 1500);
  };

  const columns = [
    { header: 'Coupon No', accessor: 'couponNo' as const },
    { header: 'Factory', accessor: 'factory' as const },
    { header: 'Purchase No', accessor: 'purchaseNo' as const },
    { header: 'Tonnage', accessor: 'tonnage' as const },
    {
      header: 'Status',
      accessor: 'status' as const,
      render: (status: string) => getStatusBadge(status),
    },
    { header: 'Collected Date', accessor: 'collectedDate' as const },
    { header: 'Handed To', accessor: 'handedTo' as const, render: (val: any) => val || '-' },
    { header: 'Handover Date', accessor: 'handoverDate' as const, render: (val: any) => val || '-' },
    {
      header: 'Actions',
      accessor: 'id' as const,
      render: (id: string, row: Coupon) => (
        <div className="flex gap-2">
          {row.status === 'InCustody' && (
            <button
              onClick={() => handleHandoverClick(row)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Hand Over
            </button>
          )}
          <Link href={`/dashboard/cement/coupons/${row.id}`} className="text-gray-600 hover:text-gray-800 text-sm font-medium">View</Link>
        </div>
      ),
    },
  ];

  const tabs = [
    {
      id: 'all',
      label: `All Coupons (${coupons.length})`,
      content: (
        <Table
          data={filteredCoupons}
          columns={columns}
          emptyMessage="No coupons found"
        />
      ),
    },
    {
      id: 'custody',
      label: `In Custody (${coupons.filter((c) => c.status === 'InCustody').length})`,
      content: (
        <Table
          data={filteredCoupons}
          columns={columns}
          emptyMessage="No coupons in custody"
        />
      ),
    },
    {
      id: 'handed',
      label: `Handed Over (${coupons.filter((c) => c.status === 'HandedOver').length})`,
      content: (
        <Table
          data={filteredCoupons}
          columns={columns}
          emptyMessage="No handed over coupons"
        />
      ),
    },
    {
      id: 'used',
      label: `Used (${coupons.filter((c) => c.status === 'Used').length})`,
      content: (
        <Table
          data={filteredCoupons}
          columns={columns}
          emptyMessage="No used coupons"
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/cement" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              ← Back to Cement Operations
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">Coupon Management</h1>
            <p className="text-gray-600 mt-1">Track and manage cement factory coupons</p>
          </div>
        </div>
        <Card>
          <CardBody className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading coupons...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/cement" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              ← Back to Cement Operations
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">Coupon Management</h1>
            <p className="text-gray-600 mt-1">Track and manage cement factory coupons</p>
          </div>
        </div>
        <Card>
          <CardBody className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error: {error}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/cement" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Back to Cement Operations
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Coupon Management</h1>
          <p className="text-gray-600 mt-1">Track and manage cement factory coupons</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => setShowRegisterModal(true)}
        >
          + Register Coupon
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-gray-900">{coupons.length}</p>
            <p className="text-sm text-gray-600 mt-1">Total Coupons</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {coupons.filter((c) => c.status === 'InCustody').length}
            </p>
            <p className="text-sm text-gray-600 mt-1">In Custody</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {coupons.filter((c) => c.status === 'HandedOver').length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Handed Over</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {coupons.filter((c) => c.status === 'Used').length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Used</p>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardBody>
          <Tabs tabs={tabs} defaultTabId="all" onChange={setActiveTab} />
        </CardBody>
      </Card>

      {/* Handover Modal */}
      <Modal
        isOpen={showHandoverModal}
        onClose={() => {
          setShowHandoverModal(false);
          setSelectedCoupon(null);
        }}
        title={`Hand Over Coupon ${selectedCoupon?.couponNo}`}
        body={
          <div className="space-y-4">
            {selectedCoupon && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Coupon Details:</p>
                <div className="text-xs space-y-1 text-gray-600">
                  <div className="flex justify-between">
                    <span>Factory:</span>
                    <span className="font-semibold">{selectedCoupon.factory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tonnage:</span>
                    <span className="font-semibold">{selectedCoupon.tonnage} tons</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Collected:</span>
                    <span className="font-semibold">{selectedCoupon.collectedDate}</span>
                  </div>
                </div>
              </div>
            )}

            <Input
              label="Receiver Name *"
              required
              placeholder="Who is receiving this coupon?"
              value={handoverData.receiverName}
              onChange={(e) =>
                setHandoverData((prev) => ({ ...prev, receiverName: e.target.value }))
              }
            />

            <Input
              label="Handover Date *"
              type="date"
              required
              value={handoverData.handoverDate}
              onChange={(e) =>
                setHandoverData((prev) => ({ ...prev, handoverDate: e.target.value }))
              }
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proof of Handover (Receipt/Signature)
              </label>
              <FileUpload
                onFilesSelected={(files) =>
                  setHandoverData((prev) => ({ ...prev, proofFile: files[0] || null }))
                }
                acceptedFileTypes={['image/*', '.pdf']}
              />
              {handoverData.proofFile && (
                <p className="text-xs text-gray-600 mt-1">
                  Selected: {handoverData.proofFile.name}
                </p>
              )}
            </div>
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowHandoverModal(false);
                setSelectedCoupon(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleHandoverSubmit}
              disabled={!handoverData.receiverName || !handoverData.handoverDate}
            >
              Confirm Handover
            </Button>
          </div>
        }
      />

      {/* Register Coupon Modal */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Register New Coupon"
        body={
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Register a new coupon from a factory. Link it to a Purchase Order for tracking.
            </p>
            <Input
              label="Coupon Number *"
              required
              placeholder="e.g., CPN-0250"
              value={registerData.couponNo}
              onChange={(e) => setRegisterData((prev) => ({ ...prev, couponNo: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Factory *</label>
              <select
                value={registerData.factoryId}
                onChange={(e) => setRegisterData((prev) => ({ ...prev, factoryId: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                required
              >
                <option value="">Select Factory</option>
                {factories.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cement Purchase *</label>
              <select
                value={registerData.purchaseId}
                onChange={(e) => setRegisterData((prev) => ({ ...prev, purchaseId: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
                required
              >
                <option value="">Select Cement Purchase</option>
                {cementPurchases.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.purchaseNo} — {cp.factory?.name || 'Factory'} — {cp.cementType || ''} ({cp.status})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Coupon will be linked to this Cement Purchase</p>
            </div>
            <Input
              label="Tonnage (tons) *"
              type="number"
              step="0.1"
              required
              placeholder="Cement tonnage covered by coupon"
              value={registerData.tonnage}
              onChange={(e) => setRegisterData((prev) => ({ ...prev, tonnage: e.target.value }))}
            />
            <Input
              label="Collection Date *"
              type="date"
              required
              value={registerData.collectionDate}
              onChange={(e) => setRegisterData((prev) => ({ ...prev, collectionDate: e.target.value }))}
            />
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowRegisterModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={isRegistering || !registerData.couponNo || !registerData.factoryId || !registerData.purchaseId || !registerData.tonnage}
              onClick={async () => {
                setIsRegistering(true);
                try {
                  const res = await fetch('/api/cement/coupons', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      couponNo: registerData.couponNo,
                      factoryId: registerData.factoryId,
                      purchaseId: registerData.purchaseId,
                      tonnage: parseFloat(registerData.tonnage),
                      collectedDate: registerData.collectionDate || new Date().toISOString(),
                    }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    alert('Coupon registered successfully!');
                    setShowRegisterModal(false);
                    setRegisterData({ couponNo: '', factoryId: '', purchaseId: '', tonnage: '', collectionDate: '' });
                    fetchCoupons();
                  } else {
                    alert(data.error || 'Failed to register coupon');
                  }
                } catch (err) {
                  alert('Failed to register coupon');
                } finally {
                  setIsRegistering(false);
                }
              }}
            >
              {isRegistering ? 'Registering...' : 'Register Coupon'}
            </Button>
          </div>
        }
      />
    </div>
  );
}
