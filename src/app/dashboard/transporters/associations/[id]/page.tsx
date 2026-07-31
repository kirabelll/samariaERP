'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button } from '@/components/ui';
import { ChevronRight, Edit2, ArrowLeft } from 'lucide-react';

interface Transporter {
  id: string;
  code: string;
  companyName: string;
  phone?: string;
  email?: string;
  status: string;
}

interface Association {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
  transporters: Transporter[];
}

export default function TransportAssociationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [association, setAssociation] = useState<Association | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssociation();
  }, [params.id]);

  const fetchAssociation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transport-associations/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setAssociation(data.data);
      } else {
        alert('Association not found');
        router.push('/dashboard/transporters/associations');
      }
    } catch (error) {
      console.error('Error fetching association:', error);
      alert('Error loading association');
      router.push('/dashboard/transporters/associations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!association) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={() => router.push('/dashboard/transporters/associations')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Transport Associations
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-medium">{association.name}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
            {association.name}
          </h1>
          <p className="text-slate-600 mt-2">Code: {association.code}</p>
        </div>
        <Link href={`/dashboard/transporters/associations/${association.id}/edit`}>
          <Button variant="primary" size="lg" className="flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Association Details */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Association Information</h2>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-600 mb-1">Status</p>
              <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                association.status === 'Active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {association.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Contact Person</p>
              <p className="text-slate-900 font-medium">{association.contactPerson || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Phone</p>
              <p className="text-slate-900 font-medium">{association.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Email</p>
              <p className="text-slate-900 font-medium">{association.email || '-'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-slate-600 mb-1">Address</p>
              <p className="text-slate-900 font-medium">{association.address || '-'}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Transporters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Associated Transporters ({association.transporters.length})
            </h2>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {association.transporters.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              No transporters associated with this association yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Company Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {association.transporters.map((transporter) => (
                    <tr key={transporter.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">
                        <Link href={`/dashboard/transporters/${transporter.id}`}>
                          {transporter.code}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">{transporter.companyName}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{transporter.phone || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{transporter.email || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          transporter.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {transporter.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Back Button */}
      <div>
        <button
          onClick={() => router.push('/dashboard/transporters/associations')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Associations
        </button>
      </div>
    </div>
  );
}
