'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

interface PricingItem {
  id: string;
  truckCategory: string;
  holdingCapacity: number;
  capacityUnit: string;
  unitPrice: number;
  totalPrice: number;
}

interface DeliverySite {
  site: string;
  pricePerUnit: number;
}

interface Transporter {
  companyName: string;
  code: string;
}

interface Supplier {
  companyName: string;
  code: string;
}

interface Agreement {
  id: string;
  agreementNo: string;
  productType: string;
  validFrom: string;
  validTo: string;
  terms: string | null;
  loadingSite: string | null;
  offloadingSite: string | null;
  deliverySites: string | null;
  pricePerUnit: number | null;
  aggregateValue: number | null;
  unitType: string | null;
  amount: number | null;
  loadSize: number | null;
  associationServiceCharge: number | null;
  associationChargeEnabled: boolean;
  status: string;
  transporter: Transporter;
  supplier: Supplier | null;
  pricingItems: PricingItem[];
}

export default function AgreementDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const agreementId = params?.id as string;

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgreement = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/transporters/agreements/${agreementId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch agreement');
        }

        setAgreement(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (agreementId) {
      fetchAgreement();
    }
  }, [agreementId]);

  const handleBack = () => {
    router.push('/dashboard/transporters/agreements');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getDeliverySites = (): DeliverySite[] => {
    if (!agreement?.deliverySites) return [];
    try {
      return JSON.parse(agreement.deliverySites);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Agreements
        </button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Agreement not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this agreement? Once deactivated, it CANNOT be reactivated.')) return;
    try {
      const res = await fetch(`/api/transporters/agreements/${agreementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Deactivated' }),
      });
      const result = await res.json();
      if (result.success) {
        setAgreement((prev) => (prev ? { ...prev, status: 'Deactivated' } : prev));
      } else {
        alert(result.error || 'Failed to deactivate agreement');
      }
    } catch {
      alert('Failed to deactivate agreement');
    }
  };

  const deliverySites = getDeliverySites();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Agreements
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{agreement.agreementNo}</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
          {agreement.agreementNo}
        </h1>
        <p className="text-slate-600 mt-2">Transporter: {agreement.transporter.companyName}</p>
      </div>

      {/* Agreement Info Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{agreement.agreementNo}</h2>
            <Badge
              status={agreement.status}
              className="mt-2"
            >
              {agreement.status}
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" size="lg" onClick={() => router.push(`/dashboard/transporters/agreements/${agreementId}/edit`)}>
              Edit
            </Button>
            {agreement.status !== 'Deactivated' && (
              <Button
                variant="outline"
                size="lg"
                onClick={handleDeactivate}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Deactivate
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={handleBack}>
              Back
            </Button>
          </div>
        </CardHeader>

        {agreement.status === 'Deactivated' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mx-6 mt-4 text-sm text-red-800 font-medium">
            This agreement is deactivated and cannot be reactivated.
          </div>
        )}

        <CardBody className="space-y-8">
          {/* Agreement Details */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Agreement Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Agreement Number
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {agreement.agreementNo}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Transporter
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {agreement.transporter.companyName}
                </p>
              </div>
              {agreement.supplier && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Supplier
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {agreement.supplier.companyName}
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Product Type
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1 capitalize">
                  {agreement.productType}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {agreement.status}
                </p>
              </div>
            </div>
          </div>

          {/* Validity Period */}
          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Validity Period</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Valid From
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {formatDate(agreement.validFrom)}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Valid To
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {formatDate(agreement.validTo)}
                </p>
              </div>
            </div>
          </div>

          {/* Routes & Delivery Sites */}
          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Routes & Delivery Sites</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agreement.loadingSite && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Loading Site (Origin)
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {agreement.loadingSite}
                  </p>
                </div>
              )}
              {agreement.offloadingSite && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Primary Offloading Site
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {agreement.offloadingSite}
                  </p>
                </div>
              )}
              {agreement.pricePerUnit != null && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Transport Rate
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {formatCurrency(agreement.pricePerUnit)} / {agreement.unitType || 'm³'}
                  </p>
                </div>
              )}
              {agreement.loadSize != null && agreement.loadSize > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Load Size
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {agreement.loadSize} {agreement.unitType || 'm³'}
                  </p>
                </div>
              )}
            </div>

            {/* Additional Delivery Sites Table */}
            {deliverySites.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Additional Delivery Sites</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Delivery Site</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Transport Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliverySites.map((ds, index) => (
                        <tr key={index} className="border-b border-slate-100">
                          <td className="px-4 py-2 text-slate-600">{index + 1}</td>
                          <td className="px-4 py-2 text-slate-900 font-medium">{ds.site}</td>
                          <td className="px-4 py-2 text-slate-900">{formatCurrency(ds.pricePerUnit)} / {agreement.unitType || 'm³'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Financial Details */}
          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agreement.amount != null && agreement.amount > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total Agreement Amount
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {formatCurrency(agreement.amount)}
                  </p>
                </div>
              )}
              {agreement.aggregateValue != null && agreement.aggregateValue > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Default Aggregate Value (per m³)
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {formatCurrency(agreement.aggregateValue)}
                  </p>
                </div>
              )}
              {agreement.associationChargeEnabled && agreement.associationServiceCharge != null && agreement.associationServiceCharge > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Association Service Charge
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {agreement.associationServiceCharge}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Applied as percentage on delivered quantity value
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Terms */}
          {agreement.terms && (
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Terms & Conditions</h3>
              <p className="text-slate-700 whitespace-pre-wrap">
                {agreement.terms}
              </p>
            </div>
          )}

          {/* Legacy Pricing Table (backward compat for old agreements) */}
          {agreement.pricingItems && agreement.pricingItems.length > 0 && (
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Pricing by Truck Category</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                        Truck Category
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                        Holding Capacity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                        Unit
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                        Unit Price
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                        Total Price
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {agreement.pricingItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-4 py-2 text-slate-900">{item.truckCategory}</td>
                        <td className="px-4 py-2 text-slate-900">{item.holdingCapacity}</td>
                        <td className="px-4 py-2 text-slate-900">{item.capacityUnit}</td>
                        <td className="px-4 py-2 text-slate-900">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-slate-900 font-medium">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
