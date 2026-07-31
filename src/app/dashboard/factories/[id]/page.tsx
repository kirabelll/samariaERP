'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card, { CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface Factory {
  id: string;
  name: string;
  code: string;
  factoryType: string;
  suppliedMaterial: string;
  location: string;
  phone: string;
  contactPerson: string;
  useCoupons: boolean;
  weighbridgeReq: boolean;
  terms: string;
  status: string;
  createdAt: string;
}

export default function FactoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [factory, setFactory] = useState<Factory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFactory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/factories/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Factory not found');
          } else {
            setError('Failed to load factory details');
          }
          return;
        }

        const result = await response.json();
        setFactory(result.data);
        setError(null);
      } catch (err) {
        setError('Failed to load factory details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFactory();
  }, [id]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/factories" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Back to List
          </Link>
        </div>
        <Card>
          <CardBody className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-slate-600">Loading factory details...</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error || !factory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/factories" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Back to List
          </Link>
        </div>
        <Card>
          <CardBody className="py-12">
            <div className="text-center">
              <p className="text-lg font-medium text-red-600 mb-4">{error || 'Factory not found'}</p>
              <Link href="/dashboard/factories" className="text-blue-600 hover:text-blue-800 font-medium">
                Return to Factories List
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/factories" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Back to List
          </Link>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">{factory.name}</h1>
        </div>
        <Link href={`/dashboard/factories/${id}/edit`}>
          <Button>Edit</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Factory Information</h2>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Factory Code</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{factory.code}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Factory Type</label>
              <p className="text-lg font-medium text-slate-900 mt-1 capitalize">{factory.factoryType}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Supplied Material</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{factory.suppliedMaterial}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{factory.location}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{factory.phone}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact Person</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{factory.contactPerson}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Uses Coupons</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{factory.useCoupons ? 'Yes' : 'No'}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Weighbridge Required</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{factory.weighbridgeReq ? 'Yes' : 'No'}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
              <p className={`text-lg font-medium mt-1 ${factory.status === 'Active' ? 'text-green-600' : 'text-slate-600'}`}>
                {factory.status}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Created Date</label>
              <p className="text-lg font-medium text-slate-900 mt-1">{formatDate(factory.createdAt)}</p>
            </div>
          </div>

          {factory.terms && (
            <div className="border-t border-slate-200 pt-6">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Terms</label>
              <p className="text-base text-slate-900 mt-2 whitespace-pre-wrap">{factory.terms}</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
