'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Select,
  Badge,
  Modal,
} from '@/components/ui';
import {
  calculatePayrollRow,
  getPayrollPeriodDates,
  ETHIOPIAN_TAX_BRACKETS,
  PayrollCalculationResult,
} from '@/lib/ethiopian-tax';

interface EmployeeRecord {
  id: string;
  employeeNo: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  department?: string | null;
  position?: string | null;
  baseSalary?: number | null;
  fieldAllowance?: number | null;
  isFieldAllowanceTaxable?: boolean | null;
  taxableAllowance?: number | null;
  nonTaxableAllowance?: number | null;
  allowances?: number | null;
  status: string;
}

interface EditablePayrollRow extends PayrollCalculationResult {
  customAllowances: number;
  customOtherDeductions: number;
  customAdvanceDeduction: number;
}

export default function NewPayrollPage() {
  const router = useRouter();
  const currentDate = new Date();
  
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(currentDate.getMonth() + 1)
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    currentDate.getFullYear().toString()
  );
  const [status, setStatus] = useState('Draft');
  
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [showTaxBracketsModal, setShowTaxBracketsModal] = useState<boolean>(false);
  const [showEmployerPension, setShowEmployerPension] = useState<boolean>(false);

  // Custom user overrides for allowances / deductions per employee (key: employeeId)
  const [adjustments, setAdjustments] = useState<
    Record<
      string,
      { allowances: number; otherDeductions: number; advanceDeduction: number }
    >
  >({});

  // Fetch active employees (includes base salary, field allowance, taxable/non-taxable allowances)
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const res = await fetch('/api/employees?limit=500');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Filter active employees or all if active is empty
          const activeEmps = json.data.filter(
            (e: EmployeeRecord) => e.status === 'Active' || !e.status
          );
          setEmployees(activeEmps.length > 0 ? activeEmps : json.data);
        }
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  // Compute date range details based on selected month and year
  const periodInfo = useMemo(() => {
    const monthNum = parseInt(selectedMonth) || 1;
    const yearNum = parseInt(selectedYear) || new Date().getFullYear();
    return getPayrollPeriodDates(yearNum, monthNum);
  }, [selectedMonth, selectedYear]);

  // Compute payroll items for all employees using fetched allowance & tax allowance
  const calculatedRows: EditablePayrollRow[] = useMemo(() => {
    return employees.map((emp) => {
      const defaultField = Number(emp.fieldAllowance || 0);
      const defaultTaxable = Number(emp.taxableAllowance || 0);
      const defaultNonTaxable = Number(emp.nonTaxableAllowance || 0);
      const defaultTotalAllowances = Number(emp.allowances || 0) || (defaultField + defaultTaxable + defaultNonTaxable);

      const adj = adjustments[emp.id];
      const allowances = adj?.allowances !== undefined ? adj.allowances : defaultTotalAllowances;
      const otherDeductions = adj?.otherDeductions !== undefined ? adj.otherDeductions : 0;
      const advanceDeduction = adj?.advanceDeduction !== undefined ? adj.advanceDeduction : 0;

      const fullName = `${emp.firstName} ${emp.middleName ? emp.middleName + ' ' : ''}${emp.lastName}`;
      const baseSalary = Number(emp.baseSalary || 0);

      const calculated = calculatePayrollRow({
        employeeId: emp.id,
        employeeNo: emp.employeeNo,
        employeeName: fullName,
        department: emp.department || 'General',
        position: emp.position || 'Staff',
        baseSalary,
        fieldAllowance: defaultField,
        isFieldAllowanceTaxable: emp.isFieldAllowanceTaxable ?? false,
        taxableAllowance: defaultTaxable,
        nonTaxableAllowance: defaultNonTaxable,
        allowances,
        otherDeductions,
        advanceDeduction,
      });

      return {
        ...calculated,
        customAllowances: allowances,
        customOtherDeductions: otherDeductions,
        customAdvanceDeduction: advanceDeduction,
      };
    });
  }, [employees, adjustments]);

  // Extract unique departments for filtering
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return ['All', ...Array.from(set)];
  }, [employees]);

  // Filtered rows based on search and department
  const filteredRows = useMemo(() => {
    return calculatedRows.filter((row) => {
      const matchesSearch =
        row.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.employeeNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.position.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept =
        departmentFilter === 'All' || row.department === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [calculatedRows, searchTerm, departmentFilter]);

  // Summary Totals
  const totals = useMemo(() => {
    return calculatedRows.reduce(
      (acc, row) => ({
        totalBaseSalary: acc.totalBaseSalary + row.baseSalary,
        totalAllowances: acc.totalAllowances + row.allowances,
        totalGrossSalary: acc.totalGrossSalary + row.grossSalary,
        totalIncomeTax: acc.totalIncomeTax + row.incomeTax,
        totalPensionEmployee: acc.totalPensionEmployee + row.pensionEmployee,
        totalPensionEmployer: acc.totalPensionEmployer + row.pensionEmployer,
        totalOtherDeductions:
          acc.totalOtherDeductions + row.otherDeductions + row.advanceDeduction,
        totalDeductions: acc.totalDeductions + row.totalDeductions,
        totalNetSalary: acc.totalNetSalary + row.netSalary,
      }),
      {
        totalBaseSalary: 0,
        totalAllowances: 0,
        totalGrossSalary: 0,
        totalIncomeTax: 0,
        totalPensionEmployee: 0,
        totalPensionEmployer: 0,
        totalOtherDeductions: 0,
        totalDeductions: 0,
        totalNetSalary: 0,
      }
    );
  }, [calculatedRows]);

  const handleAdjustmentChange = (
    employeeId: string,
    field: 'allowances' | 'otherDeductions' | 'advanceDeduction',
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    setAdjustments((prev) => ({
      ...prev,
      [employeeId]: {
        allowances: 0,
        otherDeductions: 0,
        advanceDeduction: 0,
        ...prev[employeeId],
        [field]: Math.max(0, numValue),
      },
    }));
  };

  const handleSavePayroll = async () => {
    if (!selectedMonth || !selectedYear) {
      alert('Please select month and year');
      return;
    }

    if (calculatedRows.length === 0) {
      alert('No employee records found to process payroll.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        periodName: periodInfo.periodName,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        status,
        items: calculatedRows.map((row) => ({
          employeeId: row.employeeId,
          baseSalary: row.baseSalary,
          workingDays: 30,
          absentDays: 0,
          overtimeHours: 0,
          overtimePay: 0,
          allowances: row.allowances,
          grossSalary: row.grossSalary,
          pensionEmployee: row.pensionEmployee,
          pensionEmployer: row.pensionEmployer,
          incomeTax: row.incomeTax,
          otherDeductions: row.otherDeductions,
          advanceDeduction: row.advanceDeduction,
          totalDeductions: row.totalDeductions,
          netSalary: row.netSalary,
        })),
      };

      const response = await fetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save payroll period');
      }

      alert(`Payroll period ${periodInfo.periodName} processed and saved successfully!`);
      router.push(`/dashboard/hr/payroll/${result.data.id}`);
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      '#',
      'Employee ID',
      'Employee Name',
      'Department',
      'Position',
      'Base Salary (ETB)',
      'Allowances (ETB)',
      'Gross Salary (ETB)',
      'Tax Rate',
      'Income Tax (ETB)',
      'Pension 7% (ETB)',
      'Pension 11% (ETB)',
      'Other Deductions (ETB)',
      'Net Deduction (ETB)',
      'Net Pay (ETB)',
    ];

    const csvRows = calculatedRows.map((row, idx) => [
      idx + 1,
      `"${row.employeeNo}"`,
      `"${row.employeeName}"`,
      `"${row.department}"`,
      `"${row.position}"`,
      row.baseSalary.toFixed(2),
      row.allowances.toFixed(2),
      row.grossSalary.toFixed(2),
      `"${row.taxRate}"`,
      row.incomeTax.toFixed(2),
      row.pensionEmployee.toFixed(2),
      row.pensionEmployer.toFixed(2),
      (row.otherDeductions + row.advanceDeduction).toFixed(2),
      row.totalDeductions.toFixed(2),
      row.netSalary.toFixed(2),
    ]);

    // Add totals row
    csvRows.push([
      '',
      'TOTAL',
      `${calculatedRows.length} Employees`,
      '',
      '',
      totals.totalBaseSalary.toFixed(2),
      totals.totalAllowances.toFixed(2),
      totals.totalGrossSalary.toFixed(2),
      '',
      totals.totalIncomeTax.toFixed(2),
      totals.totalPensionEmployee.toFixed(2),
      totals.totalPensionEmployer.toFixed(2),
      totals.totalOtherDeductions.toFixed(2),
      totals.totalDeductions.toFixed(2),
      totals.totalNetSalary.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payroll_${periodInfo.periodName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthOptions = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const yearOptions = [];
  const currentYr = new Date().getFullYear();
  for (let y = currentYr + 1; y >= currentYr - 4; y--) {
    yearOptions.push({ value: y.toString(), label: y.toString() });
  }

  const formatETB = (val: number) => {
    return Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/dashboard/hr/payroll" className="hover:text-blue-600">
              Payroll Processing
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">New Payroll Period</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Monthly Payroll Sheet
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Select a month to compute Ethiopian Employment Income Tax, 7% Pension, and Net Pay for all employees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowTaxBracketsModal(true)}
            className="flex items-center gap-1.5 text-slate-700 bg-white shadow-sm"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ethiopian Tax Rates
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={handleExportCSV}
            disabled={calculatedRows.length === 0}
            className="flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleSavePayroll}
            disabled={saving || loadingEmployees || calculatedRows.length === 0}
            className="shadow-md"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving Period...
              </span>
            ) : (
              `Create & Save Period (${periodInfo.periodName})`
            )}
          </Button>
        </div>
      </div>

      {/* 1. Month & Year Selector + Date Range Card */}
      <Card className="border-blue-100 shadow-sm bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/40">
        <CardBody className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Month & Year Selectors */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Month *
                </label>
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  options={monthOptions}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Year *
                </label>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  options={yearOptions}
                />
              </div>
            </div>

            {/* Middle: Calculated Date Range Banner */}
            <div className="lg:col-span-5 bg-white rounded-xl p-4 border border-blue-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Payroll Date Range
                  </div>
                  <div className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      From: {periodInfo.fromDisplay}
                    </span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      To: {periodInfo.toDisplay}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-4 w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
                <span className="text-xs text-slate-500 font-medium">Period Code</span>
                <span className="font-mono font-bold text-base text-indigo-700">
                  {periodInfo.periodName}
                </span>
              </div>
            </div>

            {/* Right: Status */}
            <div className="lg:col-span-2 flex flex-col items-start lg:items-end justify-center">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Period Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full lg:w-auto px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Draft">Draft</option>
                <option value="Processing">Processing</option>
                <option value="Approved">Approved</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="bg-white border-slate-200">
          <CardBody className="p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Employees
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              {calculatedRows.length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Active on Payroll</div>
          </CardBody>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardBody className="p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Gross Salary
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 truncate" title={`${formatETB(totals.totalGrossSalary)} ETB`}>
              {formatETB(totals.totalGrossSalary)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">ETB Total Gross</div>
          </CardBody>
        </Card>

        <Card className="bg-amber-50/60 border-amber-200">
          <CardBody className="p-4">
            <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Income Tax
            </div>
            <div className="text-lg sm:text-xl font-bold text-amber-900 mt-1 truncate" title={`${formatETB(totals.totalIncomeTax)} ETB`}>
              {formatETB(totals.totalIncomeTax)}
            </div>
            <div className="text-xs text-amber-700 mt-0.5">Ethiopia Progressive</div>
          </CardBody>
        </Card>

        <Card className="bg-purple-50/60 border-purple-200">
          <CardBody className="p-4">
            <div className="text-xs font-semibold text-purple-800 uppercase tracking-wider">
              Pension (7%)
            </div>
            <div className="text-lg sm:text-xl font-bold text-purple-900 mt-1 truncate" title={`${formatETB(totals.totalPensionEmployee)} ETB`}>
              {formatETB(totals.totalPensionEmployee)}
            </div>
            <div className="text-xs text-purple-700 mt-0.5">Employee 7%</div>
          </CardBody>
        </Card>

        <Card className="bg-rose-50/60 border-rose-200">
          <CardBody className="p-4">
            <div className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Net Deduction
            </div>
            <div className="text-lg sm:text-xl font-bold text-rose-900 mt-1 truncate" title={`${formatETB(totals.totalDeductions)} ETB`}>
              {formatETB(totals.totalDeductions)}
            </div>
            <div className="text-xs text-rose-700 mt-0.5">Tax + 7% + Other</div>
          </CardBody>
        </Card>

        <Card className="bg-emerald-50/70 border-emerald-200">
          <CardBody className="p-4">
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Net Pay
            </div>
            <div className="text-lg sm:text-xl font-bold text-emerald-900 mt-1 truncate" title={`${formatETB(totals.totalNetSalary)} ETB`}>
              {formatETB(totals.totalNetSalary)}
            </div>
            <div className="text-xs text-emerald-700 mt-0.5">Total Payable</div>
          </CardBody>
        </Card>
      </div>

      {/* 3. Table Toolbar (Search, Filter, Toggle Employer Pension) */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
              <div className="relative flex-1">
                <Input
                  placeholder="Search employee by name, ID, or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  options={departments.map((d) => ({
                    value: d,
                    label: d === 'All' ? 'All Departments' : d,
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={showEmployerPension}
                  onChange={(e) => setShowEmployerPension(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                Show Employer Pension (11%)
              </label>

              <span className="text-xs text-slate-500 font-medium">
                {filteredRows.length} of {calculatedRows.length} Employees
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 4. Full Employee Payroll Table */}
      <Card className="overflow-hidden border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 uppercase text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3 w-12 text-center">#</th>
                <th className="py-3.5 px-3 min-w-[200px]">Employee</th>
                <th className="py-3.5 px-3 min-w-[140px]">Dept / Position</th>
                <th className="py-3.5 px-3 text-right min-w-[120px]">Base Salary (ETB)</th>
                <th className="py-3.5 px-3 text-right min-w-[110px]">Allowances (ETB)</th>
                <th className="py-3.5 px-3 text-right min-w-[130px] bg-slate-200/50">Gross Salary (ETB)</th>
                <th className="py-3.5 px-3 text-right min-w-[140px] bg-amber-50/70 text-amber-950">
                  Income Tax (ETB)
                </th>
                <th className="py-3.5 px-3 text-right min-w-[130px] bg-purple-50/70 text-purple-950">
                  Pension (7%)
                </th>
                {showEmployerPension && (
                  <th className="py-3.5 px-3 text-right min-w-[130px] bg-purple-100/60 text-purple-950">
                    Employer (11%)
                  </th>
                )}
                <th className="py-3.5 px-3 text-right min-w-[110px]">Other Ded. (ETB)</th>
                <th className="py-3.5 px-3 text-right min-w-[140px] bg-rose-50/70 text-rose-950 font-bold">
                  Net Deduction
                </th>
                <th className="py-3.5 px-3 text-right min-w-[140px] bg-emerald-50/80 text-emerald-950 font-extrabold">
                  Net Pay (ETB)
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {loadingEmployees ? (
                <tr>
                  <td colSpan={showEmployerPension ? 12 : 11} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
                      <span className="text-slate-500 font-medium text-sm">
                        Loading active employees and computing Ethiopian tax & pension...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={showEmployerPension ? 12 : 11} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-slate-700">No employees found</p>
                      <p className="text-xs text-slate-500">
                        Try clearing your search or add active employees in the HR module first.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.employeeId} className="hover:bg-slate-50/80 transition-colors">
                    {/* Index */}
                    <td className="py-3 px-3 text-center text-slate-400 font-medium text-xs">
                      {idx + 1}
                    </td>

                    {/* Employee Name & No */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{row.employeeName}</div>
                      <div className="text-xs font-mono text-slate-500">
                        {row.employeeNo || 'EMP-N/A'}
                      </div>
                    </td>

                    {/* Department & Position */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800 text-xs">{row.department}</div>
                      <div className="text-xs text-slate-500">{row.position}</div>
                    </td>

                    {/* Base Salary */}
                    <td className="py-3 px-3 text-right font-medium text-slate-900">
                      {formatETB(row.baseSalary)}
                    </td>

                    {/* Allowances (Fetched & Editable) */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={row.customAllowances !== undefined ? row.customAllowances : ''}
                          placeholder="0.00"
                          onChange={(e) =>
                            handleAdjustmentChange(row.employeeId, 'allowances', e.target.value)
                          }
                          className="w-24 text-right px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 hover:bg-white font-mono font-medium"
                        />
                        {row.fieldAllowance > 0 && (
                          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-medium">
                            Field: {formatETB(row.fieldAllowance)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Gross Salary */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900 bg-slate-100/40">
                      {formatETB(row.grossSalary)}
                    </td>

                    {/* Ethiopian Income Tax */}
                    <td className="py-3 px-3 text-right bg-amber-50/40">
                      <div className="font-bold text-amber-950">{formatETB(row.incomeTax)}</div>
                      <span className="inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900">
                        {row.taxRate === '0%' ? 'Exempt (0%)' : `Tier ${row.taxRate}`}
                      </span>
                    </td>

                    {/* Pension (7% Employee) */}
                    <td className="py-3 px-3 text-right font-medium text-purple-950 bg-purple-50/40">
                      <div>{formatETB(row.pensionEmployee)}</div>
                      <span className="text-[10px] text-purple-600 font-medium">7% Base</span>
                    </td>

                    {/* Employer Pension (11%) if enabled */}
                    {showEmployerPension && (
                      <td className="py-3 px-3 text-right font-medium text-purple-900 bg-purple-100/30">
                        <div>{formatETB(row.pensionEmployer)}</div>
                        <span className="text-[10px] text-purple-600 font-medium">11% Base</span>
                      </td>
                    )}

                    {/* Other Deductions (Editable) */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={row.customOtherDeductions || ''}
                        placeholder="0.00"
                        onChange={(e) =>
                          handleAdjustmentChange(
                            row.employeeId,
                            'otherDeductions',
                            e.target.value
                          )
                        }
                        className="w-24 text-right px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 hover:bg-white"
                      />
                    </td>

                    {/* Net Deduction */}
                    <td className="py-3 px-3 text-right font-bold text-rose-950 bg-rose-50/50">
                      {formatETB(row.totalDeductions)}
                    </td>

                    {/* Net Pay */}
                    <td className="py-3 px-3 text-right font-black text-emerald-950 bg-emerald-50/60 text-base">
                      {formatETB(row.netSalary)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Table Footer with Totals */}
            {calculatedRows.length > 0 && (
              <tfoot className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300 text-xs sm:text-sm">
                <tr>
                  <td colSpan={3} className="py-4 px-3 text-left">
                    TOTAL ({calculatedRows.length} Employees)
                  </td>
                  <td className="py-4 px-3 text-right font-bold">
                    {formatETB(totals.totalBaseSalary)}
                  </td>
                  <td className="py-4 px-3 text-right font-bold">
                    {formatETB(totals.totalAllowances)}
                  </td>
                  <td className="py-4 px-3 text-right font-black bg-slate-200/60">
                    {formatETB(totals.totalGrossSalary)}
                  </td>
                  <td className="py-4 px-3 text-right font-black text-amber-950 bg-amber-100/60">
                    {formatETB(totals.totalIncomeTax)}
                  </td>
                  <td className="py-4 px-3 text-right font-black text-purple-950 bg-purple-100/60">
                    {formatETB(totals.totalPensionEmployee)}
                  </td>
                  {showEmployerPension && (
                    <td className="py-4 px-3 text-right font-black text-purple-950 bg-purple-200/50">
                      {formatETB(totals.totalPensionEmployer)}
                    </td>
                  )}
                  <td className="py-4 px-3 text-right font-bold">
                    {formatETB(totals.totalOtherDeductions)}
                  </td>
                  <td className="py-4 px-3 text-right font-black text-rose-950 bg-rose-100/70">
                    {formatETB(totals.totalDeductions)}
                  </td>
                  <td className="py-4 px-3 text-right font-black text-emerald-950 bg-emerald-100/80 text-base">
                    {formatETB(totals.totalNetSalary)} ETB
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <Link href="/dashboard/hr/payroll">
          <Button variant="outline" size="lg">
            &larr; Cancel & Back
          </Button>
        </Link>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="lg"
            onClick={handleExportCSV}
            disabled={calculatedRows.length === 0}
            className="flex-1 sm:flex-none"
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={handleSavePayroll}
            disabled={saving || loadingEmployees || calculatedRows.length === 0}
            className="flex-1 sm:flex-none shadow-lg shadow-blue-500/20"
          >
            {saving ? 'Processing & Saving...' : `Save Payroll Period (${periodInfo.periodName})`}
          </Button>
        </div>
      </div>

      {/* Tax Rates Reference Modal */}
      <Modal
        isOpen={showTaxBracketsModal}
        onClose={() => setShowTaxBracketsModal(false)}
        title="Ethiopian Employment Income Tax Schedule"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Monthly Ethiopian employment income tax is calculated progressively based on the official proclamation brackets:
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100 text-slate-800 uppercase text-xs font-bold">
                <tr>
                  <th className="py-2.5 px-3">Monthly Income (ETB)</th>
                  <th className="py-2.5 px-3">Tax Rate</th>
                  <th className="py-2.5 px-3">Deduction (ETB)</th>
                  <th className="py-2.5 px-3">Formula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ETHIOPIAN_TAX_BRACKETS.map((bracket, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium">
                      {bracket.max === Infinity
                        ? `Over ${bracket.min.toLocaleString()} ETB`
                        : `${bracket.min.toLocaleString()} - ${bracket.max.toLocaleString()} ETB`}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        bracket.rate === 0
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {bracket.label}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono">{bracket.deduction.toLocaleString()} ETB</td>
                    <td className="py-2 px-3 text-xs text-slate-500 font-mono">
                      {bracket.rate === 0
                        ? 'Tax = 0'
                        : `(Gross × ${(bracket.rate * 100).toFixed(0)}%) - ${bracket.deduction}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
            <div className="font-bold">Pension Contributions:</div>
            <div>&bull; <strong>Employee Pension:</strong> 7% of base salary (deducted from employee salary)</div>
            <div>&bull; <strong>Employer Pension:</strong> 11% of base salary (company contribution)</div>
            <div>&bull; <strong>Total Pension:</strong> 18% of base salary submitted to Social Security Agency</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
