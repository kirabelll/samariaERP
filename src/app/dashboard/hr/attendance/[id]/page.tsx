'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

export default function AttendanceDetailDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/hr/attendance/${recordId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch record');
        }

        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (recordId) {
      fetchData();
    }
  }, [recordId]);

  const handleEdit = () => {
    router.push(`/dashboard/hr/attendance/${recordId}/edit`);
  };

  const handleBack = () => {
    router.push(`/dashboard/hr/attendance`);
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

  if (error || !data) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back
        </button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'Record not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          attendance
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">Details</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
          Record Details
        </h1>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Details</h2>
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
          {/* Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {["employeeId","date","checkIn","checkOut","status","notes"].map((field) => (
                <div key={field}>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {field}
                  </label>
                  <p className="text-lg font-medium text-slate-900 mt-1">
                    {data[field] !== undefined && data[field] !== null ? String(data[field]) : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
