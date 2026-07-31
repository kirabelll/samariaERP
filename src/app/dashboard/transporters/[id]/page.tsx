'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

interface Truck {
  id: string;
  plateNo: string;
  truckType: string;
  ownerName?: string;
  driverName?: string;
  capacity: number;
  capacityUnit: string;
  status: string;
}

interface Transporter {
  id: string;
  code: string;
  transporterType: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  tin: string;
  phone: string;
  email: string;
  contactPerson: string;
  location: string;
  withholding: boolean;
  withholdRate: number;
  status: 'Active' | 'Inactive';
  trucks?: Truck[];
}

export default function TransporterDetails() {
  const router = useRouter();
  const params = useParams();
  const transporterId = params?.id as string;

  const [transporter, setTransporter] = useState<Transporter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransporter = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/transporters/${transporterId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to fetch transporter');
        }

        setTransporter(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (transporterId) {
      fetchTransporter();
    }
  }, [transporterId]);

  const handleEdit = () => {
    router.push(`/dashboard/transporters/${transporterId}/edit`);
  };

  const handleBack = () => {
    router.push('/dashboard/transporters');
  };

  const getTransporterName = (transporter: Transporter) => {
    if (transporter.companyName) {
      return transporter.companyName;
    }
    return `${transporter.firstName || ''} ${transporter.lastName || ''}`.trim() || 'N/A';
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

  if (error || !transporter) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Transporters
        </button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Transporter not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const transporterName = getTransporterName(transporter);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Transporters
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{transporterName}</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
          {transporterName}
        </h1>
        <p className="text-slate-600 mt-2">Transporter ID: {transporter.code}</p>
      </div>

      {/* Transporter Info Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{transporterName}</h2>
            <Badge
              status={transporter.status === 'Active' ? 'Active' : 'Inactive'}
              className="mt-2"
            >
              {transporter.status}
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" size="lg" onClick={handleEdit}>
              Edit
            </Button>
            <Button variant="outline" size="lg" onClick={handleBack}>
              Back
            </Button>
          </div>
        </CardHeader>

        <CardBody className="space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Transporter Type
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {transporter.transporterType || 'N/A'}
                </p>
              </div>
              {transporter.companyName && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Company Name
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {transporter.companyName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Email
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{transporter.email}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Phone
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{transporter.phone}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Contact Person
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {transporter.contactPerson || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Location
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {transporter.location || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  TIN
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">{transporter.tin}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Withholding
                </label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {transporter.withholding ? 'Yes' : 'No'}
                </p>
              </div>
              {transporter.withholding && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Withhold Rate
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {transporter.withholdRate}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Fleet/Trucks */}
          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Fleet Information</h3>
            {!transporter.trucks || transporter.trucks.length === 0 ? (
              <p className="text-slate-600">No trucks registered</p>
            ) : (
              <div className="space-y-4">
                {transporter.trucks.map((truck) => (
                  <div key={truck.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{truck.plateNo}</p>
                        <Badge status={truck.status} className="mt-1">
                          {truck.status}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEdit}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Truck Type
                        </label>
                        <p className="text-slate-900 font-medium mt-1">{truck.truckType}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Owner Name
                        </label>
                        <p className="text-slate-900 font-medium mt-1">{truck.ownerName || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Driver Name
                        </label>
                        <p className="text-slate-900 font-medium mt-1">{truck.driverName || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Capacity
                        </label>
                        <p className="text-slate-900 font-medium mt-1">{truck.capacity} {truck.capacityUnit}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
