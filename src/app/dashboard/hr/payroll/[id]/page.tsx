'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';
import { getPayrollPeriodDates } from '@/lib/ethiopian-tax';

interface PayrollItemDetail {
  id: string;
  employeeId: string;
  baseSalary: number;
  grossSalary: number;
  allowances: number;
  incomeTax: number;
  pensionEmployee: number;
  pensionEmployer: number;
  otherDeductions: number;
  advanceDeduction: number;
  totalDeductions: number;
  netSalary: number;
  employee: {
    id: string;
    employeeNo: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    department?: string | null;
    position?: string | null;
  };
}

export default function PayrollPeriodDetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/hr/payroll/${recordId}`);
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

  useEffect(() => {
    if (recordId) {
      fetchRecord();
    }
  }, [recordId]);

  const periodDates = useMemo(() => {
    if (!data?.month || !data?.year) return null;
    return getPayrollPeriodDates(Number(data.year), Number(data.month));
  }, [data]);

  const items: PayrollItemDetail[] = useMemo(() => {
    return data?.items || [];
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter((item) => {
      const name = `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`.toLowerCase();
      const empNo = (item.employee?.employeeNo || '').toLowerCase();
      const dept = (item.employee?.department || '').toLowerCase();
      const s = searchTerm.toLowerCase();
      return name.includes(s) || empNo.includes(s) || dept.includes(s);
    });
  }, [items, searchTerm]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        grossSalary: acc.grossSalary + (item.grossSalary || 0),
        baseSalary: acc.baseSalary + (item.baseSalary || 0),
        allowances: acc.allowances + (item.allowances || 0),
        incomeTax: acc.incomeTax + (item.incomeTax || 0),
        pensionEmployee: acc.pensionEmployee + (item.pensionEmployee || 0),
        pensionEmployer: acc.pensionEmployer + (item.pensionEmployer || 0),
        otherDeductions: acc.otherDeductions + (item.otherDeductions || 0) + (item.advanceDeduction || 0),
        totalDeductions: acc.totalDeductions + (item.totalDeductions || 0),
        netSalary: acc.netSalary + (item.netSalary || 0),
      }),
      {
        grossSalary: 0,
        baseSalary: 0,
        allowances: 0,
        incomeTax: 0,
        pensionEmployee: 0,
        pensionEmployer: 0,
        otherDeductions: 0,
        totalDeductions: 0,
        netSalary: 0,
      }
    );
  }, [items]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/hr/payroll/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || 'Failed to update status');
      }
      setData(resJson.data);
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) return;

    const headers = [
      '#',
      'Employee ID',
      'Employee Name',
      'Department',
      'Position',
      'Base Salary (ETB)',
      'Allowances (ETB)',
      'Gross Salary (ETB)',
      'Income Tax (ETB)',
      'Pension 7% (ETB)',
      'Pension 11% (ETB)',
      'Other Deductions (ETB)',
      'Net Deduction (ETB)',
      'Net Pay (ETB)',
    ];

    const csvRows = items.map((item, idx) => [
      idx + 1,
      `"${item.employee?.employeeNo || ''}"`,
      `"${item.employee?.firstName || ''} ${item.employee?.lastName || ''}"`,
      `"${item.employee?.department || ''}"`,
      `"${item.employee?.position || ''}"`,
      item.baseSalary.toFixed(2),
      item.allowances.toFixed(2),
      item.grossSalary.toFixed(2),
      item.incomeTax.toFixed(2),
      item.pensionEmployee.toFixed(2),
      item.pensionEmployer.toFixed(2),
      (item.otherDeductions + (item.advanceDeduction || 0)).toFixed(2),
      item.totalDeductions.toFixed(2),
      item.netSalary.toFixed(2),
    ]);

    csvRows.push([
      '',
      'TOTAL',
      `${items.length} Employees`,
      '',
      '',
      totals.baseSalary.toFixed(2),
      totals.allowances.toFixed(2),
      totals.grossSalary.toFixed(2),
      totals.incomeTax.toFixed(2),
      totals.pensionEmployee.toFixed(2),
      totals.pensionEmployer.toFixed(2),
      totals.otherDeductions.toFixed(2),
      totals.totalDeductions.toFixed(2),
      totals.netSalary.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payroll_${data.periodName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatETB = (val: number) => {
    return Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="text-slate-600 font-medium">Loading payroll details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/hr/payroll" className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
          &larr; Back to Payroll Periods
        </Link>
        <Card>
          <CardBody>
            <p className="text-red-600 font-semibold">{error || 'Payroll record not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/dashboard/hr/payroll" className="hover:text-blue-600">
              Payroll Processing
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">{data.periodName}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Payroll Period {data.periodName}
            </h1>
            <Badge status={data.status as any}>{data.status}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="md" onClick={handleExportCSV}>
            <svg className="w-4 h-4 mr-1 text-blue-600 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>

          {data.status === 'Draft' && (
            <Button
              variant="primary"
              size="md"
              disabled={updatingStatus}
              onClick={() => handleStatusChange('Approved')}
            >
              Approve Period
            </Button>
          )}

          {data.status === 'Approved' && (
            <Button
              variant="primary"
              size="md"
              disabled={updatingStatus}
              onClick={() => handleStatusChange('Paid')}
            >
              Mark as Paid
            </Button>
          )}

          <Link href={`/dashboard/hr/payroll/${recordId}/edit`}>
            <Button variant="outline" size="md">
              Edit Period
            </Button>
          </Link>
        </div>
      </div>

      {/* Period Dates Card */}
      {periodDates && (
        <Card className="bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/40 border-blue-100">
          <CardBody className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase">Month & Year</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {periodDates.monthName} {data.year}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase">From Date</span>
                <p className="font-bold text-blue-700 mt-0.5">
                  {periodDates.fromDisplay}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase">To Date</span>
                <p className="font-bold text-blue-700 mt-0.5">
                  {periodDates.toDisplay}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase">Pay Date</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {periodDates.payDisplay}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* KPI Totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="bg-white border-slate-200">
          <CardBody className="p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase">Employees</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{items.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">On Payroll</div>
          </CardBody>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardBody className="p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Gross</div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 truncate">
              {formatETB(totals.grossSalary)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">ETB Total</div>
          </CardBody>
        </Card>

        <Card className="bg-amber-50/60 border-amber-200">
          <CardBody className="p-4">
            <div className="text-xs font-semibold text-amber-800 uppercase">Total Tax</div>
            <div className="text-lg sm:text-xl font-bold text-amber-900 mt-1 truncate">
              {formatETB(totals.incomeTax)}
            </div>
            <div className="text-xs text-amber-700 mt-0.5">Ethiopia Tax</div>
          </CardBody>
        </Card>

        <Card className="bg-purple-50/60 border-purple-200">
          <CardBody className="p-4">
            <div className="text-xs font-semibold text-purple-800 uppercase">Pension (7%)</div>
            <div className="text-lg sm:text-xl font-bold text-purple-900 mt-1 truncate">
              {formatETB(totals.pensionEmployee)}
            </div>
            <div className="text-xs text-purple-700 mt-0.5">Employee Contrib.</div>
          </CardBody>
        </Card>

        <Card className="bg-rose-50/60 border-rose-200">
          <CardBody className="p-4">
            <div className="text-xs font-semibold text-rose-800 uppercase">Total Deductions</div>
            <div className="text-lg sm:text-xl font-bold text-rose-900 mt-1 truncate">
              {formatETB(totals.totalDeductions)}
            </div>
            <div className="text-xs text-rose-700 mt-0.5">Net Deductions</div>
          </CardBody>
        </Card>

        <Card className="bg-emerald-50/70 border-emerald-200">
          <CardBody className="p-4">
            <div className="text-xs font-semibold text-emerald-800 uppercase">Total Net Pay</div>
            <div className="text-lg sm:text-xl font-bold text-emerald-900 mt-1 truncate">
              {formatETB(totals.netSalary)}
            </div>
            <div className="text-xs text-emerald-700 mt-0.5">Payable Amount</div>
          </CardBody>
        </Card>
      </div>

      {/* Search Filter */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="Filter by employee name or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-sm"
        />
      </div>

      {/* Full Payroll Items Table */}
      <Card className="overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3 min-w-[180px]">Employee</th>
                <th className="py-3 px-3 min-w-[130px]">Dept / Position</th>
                <th className="py-3 px-3 text-right min-w-[120px]">Base Salary (ETB)</th>
                <th className="py-3 px-3 text-right min-w-[110px]">Allowances</th>
                <th className="py-3 px-3 text-right min-w-[120px] bg-slate-200/50">Gross Salary</th>
                <th className="py-3 px-3 text-right min-w-[130px] bg-amber-50/70 text-amber-950">Income Tax</th>
                <th className="py-3 px-3 text-right min-w-[120px] bg-purple-50/70 text-purple-950">Pension (7%)</th>
                <th className="py-3 px-3 text-right min-w-[110px]">Other Ded.</th>
                <th className="py-3 px-3 text-right min-w-[130px] bg-rose-50/70 text-rose-950 font-bold">Net Deduction</th>
                <th className="py-3 px-3 text-right min-w-[130px] bg-emerald-50/80 text-emerald-950 font-extrabold">Net Pay (ETB)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    No employee items recorded for this payroll period.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-medium text-xs">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">
                        {item.employee?.firstName} {item.employee?.middleName ? item.employee.middleName + ' ' : ''}{item.employee?.lastName}
                      </div>
                      <div className="text-xs font-mono text-slate-500">{item.employee?.employeeNo || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800 text-xs">{item.employee?.department || '-'}</div>
                      <div className="text-xs text-slate-500">{item.employee?.position || '-'}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-medium">{formatETB(item.baseSalary)}</td>
                    <td className="py-3 px-3 text-right text-slate-600">{formatETB(item.allowances)}</td>
                    <td className="py-3 px-3 text-right font-bold bg-slate-100/40">{formatETB(item.grossSalary)}</td>
                    <td className="py-3 px-3 text-right font-bold text-amber-950 bg-amber-50/40">
                      {formatETB(item.incomeTax)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-purple-950 bg-purple-50/40">
                      {formatETB(item.pensionEmployee)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {formatETB((item.otherDeductions || 0) + (item.advanceDeduction || 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-950 bg-rose-50/50">
                      {formatETB(item.totalDeductions)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-950 bg-emerald-50/60">
                      {formatETB(item.netSalary)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {items.length > 0 && (
              <tfoot className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300 text-xs sm:text-sm">
                <tr>
                  <td colSpan={3} className="py-4 px-3 text-left">
                    TOTAL ({items.length} Employees)
                  </td>
                  <td className="py-4 px-3 text-right font-bold">{formatETB(totals.baseSalary)}</td>
                  <td className="py-4 px-3 text-right font-bold">{formatETB(totals.allowances)}</td>
                  <td className="py-4 px-3 text-right font-black bg-slate-200/60">{formatETB(totals.grossSalary)}</td>
                  <td className="py-4 px-3 text-right font-black text-amber-950 bg-amber-100/60">{formatETB(totals.incomeTax)}</td>
                  <td className="py-4 px-3 text-right font-black text-purple-950 bg-purple-100/60">{formatETB(totals.pensionEmployee)}</td>
                  <td className="py-4 px-3 text-right font-bold">{formatETB(totals.otherDeductions)}</td>
                  <td className="py-4 px-3 text-right font-black text-rose-950 bg-rose-100/70">{formatETB(totals.totalDeductions)}</td>
                  <td className="py-4 px-3 text-right font-black text-emerald-950 bg-emerald-100/80 text-base">
                    {formatETB(totals.netSalary)} ETB
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
