'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';
import { DollarSign, Calculator, ShieldCheck } from 'lucide-react';
import {
  calculateEthiopianIncomeTax,
  getTaxBracketRate,
  calculateEmployeePension,
  calculateEmployerPension,
  ETHIOPIAN_TAX_BRACKETS,
  formatETB,
} from '@/lib/ethiopian-tax';

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
  fieldAllowance?: number;
  isFieldAllowanceTaxable?: boolean;
  taxableAllowance?: number;
  nonTaxableAllowance?: number;
  allowances?: number;
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
  fieldAllowance: 'Field Allowance (ETB)',
  taxableAllowance: 'Taxable Allowance (ETB)',
  nonTaxableAllowance: 'Tax-Exempt Allowance (ETB)',
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
    return `${formatETB(value)} ETB`;
  };

  const taxCalculations = useMemo(() => {
    if (!data) return null;
    const baseSalaryNum = Number(data.baseSalary || 0);
    const fieldAllowanceNum = Number(data.fieldAllowance || 0);
    const taxableAllowanceNum = Number(data.taxableAllowance || 0);
    const nonTaxableAllowanceNum = Number(data.nonTaxableAllowance || 0);

    const taxableField = data.isFieldAllowanceTaxable ? fieldAllowanceNum : 0;
    const nonTaxableField = data.isFieldAllowanceTaxable ? 0 : fieldAllowanceNum;

    const totalTaxableAllowances = taxableAllowanceNum + taxableField;
    const totalNonTaxableAllowances = nonTaxableAllowanceNum + nonTaxableField;
    const totalAllowances = totalTaxableAllowances + totalNonTaxableAllowances;

    const taxableGross = baseSalaryNum + totalTaxableAllowances;
    const totalGrossSalary = baseSalaryNum + totalAllowances;

    const incomeTax = calculateEthiopianIncomeTax(taxableGross);
    const activeBracketRate = getTaxBracketRate(taxableGross);

    const pensionEmployee = calculateEmployeePension(baseSalaryNum);
    const pensionEmployer = calculateEmployerPension(baseSalaryNum);
    const totalPension = Math.round((pensionEmployee + pensionEmployer) * 100) / 100;

    const totalEmployeeDeductions = Math.round((incomeTax + pensionEmployee) * 100) / 100;
    const estimatedNetSalary = Math.max(0, Math.round((totalGrossSalary - totalEmployeeDeductions) * 100) / 100);

    return {
      baseSalary: baseSalaryNum,
      fieldAllowance: fieldAllowanceNum,
      isFieldAllowanceTaxable: Boolean(data.isFieldAllowanceTaxable),
      taxableAllowance: taxableAllowanceNum,
      nonTaxableAllowance: nonTaxableAllowanceNum,
      totalTaxableAllowances,
      totalNonTaxableAllowances,
      totalAllowances,
      taxableGross,
      totalGrossSalary,
      incomeTax,
      activeBracketRate,
      pensionEmployee,
      pensionEmployer,
      totalPension,
      totalEmployeeDeductions,
      estimatedNetSalary,
    };
  }, [data]);

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

          {/* Salary & Allowances Section */}
          <div className="rounded-xl border border-indigo-200 bg-slate-50/50 p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Salary & Allowances</h3>
                  <p className="text-xs text-slate-500">
                    Monthly compensation package and Ethiopian Tax Schedule 'A' breakdown
                  </p>
                </div>
              </div>
              {taxCalculations && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Tax Bracket: {taxCalculations.activeBracketRate}
                </span>
              )}
            </div>

            {/* Compensation Inputs / Values */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.baseSalary}
                </label>
                <p className="text-base font-bold font-mono text-slate-900 mt-1">
                  {formatCurrency(data.baseSalary)}
                </p>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Subject to Pension (7% / 11%)
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.fieldAllowance}
                </label>
                <p className="text-base font-bold font-mono text-slate-900 mt-1">
                  {formatCurrency(data.fieldAllowance)}
                </p>
                <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                  {data.isFieldAllowanceTaxable ? (
                    <span className="text-amber-700">Taxable Field Allowance</span>
                  ) : (
                    <span className="text-emerald-700">Tax-Exempt Per Diem</span>
                  )}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.taxableAllowance}
                </label>
                <p className="text-base font-bold font-mono text-slate-900 mt-1">
                  {formatCurrency(data.taxableAllowance)}
                </p>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Housing / Position / Rep
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {fieldLabels.nonTaxableAllowance}
                </label>
                <p className="text-base font-bold font-mono text-slate-900 mt-1">
                  {formatCurrency(data.nonTaxableAllowance)}
                </p>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Transport / Non-Taxable
                </span>
              </div>
            </div>

            {/* Live Payroll & Tax Calculation Cards */}
            {taxCalculations && (
              <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    Calculated Payroll & Deduction Summary
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
                      Gross Salary
                    </span>
                    <p className="text-base font-bold text-slate-900 mt-1 font-mono">
                      {formatCurrency(taxCalculations.totalGrossSalary)}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Base + All Allowances
                    </span>
                  </div>

                  <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                    <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide block">
                      Taxable Gross
                    </span>
                    <p className="text-base font-bold text-indigo-900 mt-1 font-mono">
                      {formatCurrency(taxCalculations.taxableGross)}
                    </p>
                    <span className="text-[10px] text-indigo-500 block mt-0.5">
                      Subject to Income Tax
                    </span>
                  </div>

                  <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                    <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide block">
                      Income Tax
                    </span>
                    <p className="text-base font-bold text-amber-700 mt-1 font-mono">
                      {formatCurrency(taxCalculations.incomeTax)}
                    </p>
                    <span className="text-[10px] text-amber-600 block mt-0.5">
                      Ethiopian Schedule 'A'
                    </span>
                  </div>

                  <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide block">
                      Estimated Net Pay
                    </span>
                    <p className="text-lg font-extrabold text-emerald-700 mt-1 font-mono">
                      {formatCurrency(taxCalculations.estimatedNetSalary)}
                    </p>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">
                      Take-Home Monthly Pay
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">Employee Pension (7%):</span>
                    <span className="font-bold font-mono text-slate-900">
                      {formatCurrency(taxCalculations.pensionEmployee)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">Employer Pension (11%):</span>
                    <span className="font-bold font-mono text-slate-900">
                      {formatCurrency(taxCalculations.pensionEmployer)}
                    </span>
                  </div>
                  <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-rose-800 flex items-center justify-between">
                    <span className="font-medium">Total Deductions:</span>
                    <span className="font-bold font-mono text-rose-700">
                      -{formatCurrency(taxCalculations.totalEmployeeDeductions)}
                    </span>
                  </div>
                </div>
              </div>
            )}
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
