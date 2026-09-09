'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';

interface EmployeeData {
  id: string;
  employeeNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  firstNameAm?: string;
  lastNameAm?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
  hireDate?: string;
  employmentType?: string;
  baseSalary?: number;
  bankName?: string;
  bankAccount?: string;
  tin?: string;
  pensionNo?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  address?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

const fieldLabels: Record<string, string> = {
  employeeNo: 'Employee Number',
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  firstNameAm: 'First Name (Amharic)',
  lastNameAm: 'Last Name (Amharic)',
  gender: 'Gender',
  dateOfBirth: 'Date of Birth',
  phone: 'Phone',
  email: 'Email',
  department: 'Department',
  position: 'Position',
  employmentType: 'Employment Type',
  hireDate: 'Hire Date',
  baseSalary: 'Base Salary (ETB)',
  bankName: 'Bank Name',
  bankAccount: 'Bank Account',
  tin: 'TIN',
  pensionNo: 'Pension Number',
  emergencyContact: 'Emergency Contact Name',
  emergencyPhone: 'Emergency Contact Phone',
  address: 'Address / Location',
  status: 'Status',
  createdAt: 'Registered At',
  updatedAt: 'Last Updated',
};

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [data, setData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees/${recordId}`);
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
    router.push(`/dashboard/employees/${recordId}/edit`);
  };

  const handleBack = () => {
    router.push(`/dashboard/employees`);
  };

  const getStatusValue = (status?: string) => {
    switch (status) {
      case 'Active':
        return 'Active';
      case 'Inactive':
        return 'Rejected';
      default:
        return 'Draft';
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '0.00 ETB';
    return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading employee details...</p>
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Employees
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{data.firstName} {data.lastName}</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{data.firstName} {data.lastName}</h1>
        <p className="text-slate-600 mt-1">{data.employeeNo}</p>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Employee Details</h2>
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
          {/* Personal Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.employeeNo}
                </label>
                <p className="text-base font-semibold font-mono text-slate-900 mt-1">{data.employeeNo}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.firstName}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.firstName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.middleName}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.middleName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.lastName}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.lastName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.firstNameAm}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.firstNameAm || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.lastNameAm}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.lastNameAm || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.gender}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.gender || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.dateOfBirth}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{formatDate(data.dateOfBirth)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.phone}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.phone || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.email}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.email || 'N/A'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.address}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Employment Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.department}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.department || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.position}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.position || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.employmentType}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.employmentType || 'Permanent'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.hireDate}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{formatDate(data.hireDate)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.status}
                </label>
                <div className="mt-1">
                  <Badge status={getStatusValue(data.status)}>
                    {data.status || 'N/A'}
                  </Badge>
                </div>
              </div>
              {data.createdAt && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {fieldLabels.createdAt}
                  </label>
                  <p className="text-base font-medium text-slate-900 mt-1">{formatDate(data.createdAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Salary Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b">Salary Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.baseSalary}
                </label>
                <p className="text-base font-bold font-mono text-slate-900 mt-1">{formatCurrency(data.baseSalary)}</p>
              </div>
            </div>
          </div>

          {/* Banking & Tax Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b">Banking & Tax Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.bankName}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.bankName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.bankAccount}
                </label>
                <p className="text-base font-mono font-medium text-slate-900 mt-1">{data.bankAccount || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.tin}
                </label>
                <p className="text-base font-mono font-medium text-slate-900 mt-1">{data.tin || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.pensionNo}
                </label>
                <p className="text-base font-mono font-medium text-slate-900 mt-1">{data.pensionNo || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Emergency Contact Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.emergencyContact}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.emergencyContact || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.emergencyPhone}
                </label>
                <p className="text-base font-medium text-slate-900 mt-1">{data.emergencyPhone || 'N/A'}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
