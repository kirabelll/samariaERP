'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select, Badge } from '@/components/ui';
import { DollarSign, Trash2, Calculator, ShieldCheck } from 'lucide-react';
import {
  calculateEthiopianIncomeTax,
  getTaxBracketRate,
  calculateEmployeePension,
  calculateEmployerPension,
  ETHIOPIAN_TAX_BRACKETS,
  formatETB,
} from '@/lib/ethiopian-tax';

interface FormData {
  firstName: string;
  lastName: string;
  middleName: string;
  firstNameAm: string;
  lastNameAm: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  address: string;
  tin: string;
  pensionNo: string;
  emergencyContact: string;
  emergencyPhone: string;
  employeeId: string;
  department: string;
  position: string;
  employmentType: string;
  hireDate: string;
  salary: string; // Base Salary
  fieldAllowance: string; // Field Allowance
  isFieldAllowanceTaxable: boolean;
  taxableAllowance: string; // Other Taxable Allowances (Housing, Position, etc.)
  nonTaxableAllowance: string; // Tax-Exempt Allowances (Transport, Per Diem)
  bankName: string;
  bankAccount: string;
  status: 'Active' | 'Inactive';
}

interface FormErrors {
  [key: string]: string;
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    middleName: '',
    firstNameAm: '',
    lastNameAm: '',
    gender: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    address: '',
    tin: '',
    pensionNo: '',
    emergencyContact: '',
    emergencyPhone: '',
    employeeId: '',
    department: '',
    position: '',
    employmentType: 'Permanent',
    hireDate: '',
    salary: '',
    fieldAllowance: '',
    isFieldAllowanceTaxable: false,
    taxableAllowance: '',
    nonTaxableAllowance: '',
    bankName: '',
    bankAccount: '',
    status: 'Active',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!employeeId) return;

    const fetchEmployee = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/employees/${employeeId}`);
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch employee');
        }

        const emp = result.data;

        // Safely extract YYYY-MM-DD without timezone shifting
        const formatDateToInput = (d: any): string => {
          if (!d) return '';
          if (typeof d === 'string') {
            if (d.includes('T')) return d.split('T')[0];
            return d.slice(0, 10);
          }
          try {
            const dt = new Date(d);
            if (isNaN(dt.getTime())) return '';
            return dt.toISOString().split('T')[0];
          } catch {
            return '';
          }
        };

        setFormData({
          firstName: emp.firstName ?? '',
          lastName: emp.lastName ?? '',
          middleName: emp.middleName ?? '',
          firstNameAm: emp.firstNameAm ?? '',
          lastNameAm: emp.lastNameAm ?? '',
          gender: emp.gender ?? '',
          dateOfBirth: formatDateToInput(emp.dateOfBirth),
          email: emp.email ?? '',
          phone: emp.phone ?? '',
          address: emp.address ?? '',
          tin: emp.tin ?? '',
          pensionNo: emp.pensionNo ?? '',
          emergencyContact: emp.emergencyContact ?? '',
          emergencyPhone: emp.emergencyPhone ?? '',
          employeeId: emp.employeeNo ?? emp.employeeId ?? '',
          department: emp.department ?? '',
          position: emp.position ?? '',
          employmentType: emp.employmentType ?? 'Permanent',
          hireDate: formatDateToInput(emp.hireDate),
          salary: emp.baseSalary !== undefined && emp.baseSalary !== null ? String(emp.baseSalary) : '',
          fieldAllowance: emp.fieldAllowance !== undefined && emp.fieldAllowance !== null ? String(emp.fieldAllowance) : '',
          isFieldAllowanceTaxable: Boolean(emp.isFieldAllowanceTaxable),
          taxableAllowance: emp.taxableAllowance !== undefined && emp.taxableAllowance !== null ? String(emp.taxableAllowance) : '',
          nonTaxableAllowance: emp.nonTaxableAllowance !== undefined && emp.nonTaxableAllowance !== null ? String(emp.nonTaxableAllowance) : '',
          bankName: emp.bankName ?? '',
          bankAccount: emp.bankAccount ?? '',
          status: (emp.status as any) || 'Active',
        });
      } catch (err: any) {
        console.error('Error fetching employee:', err);
        setErrors({ fetch: err.message || 'Failed to load employee details' });
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId]);

  // Parse numbers for payroll & tax calculations
  const baseSalaryNum = parseFloat(formData.salary) || 0;
  const fieldAllowanceNum = parseFloat(formData.fieldAllowance) || 0;
  const taxableAllowanceNum = parseFloat(formData.taxableAllowance) || 0;
  const nonTaxableAllowanceNum = parseFloat(formData.nonTaxableAllowance) || 0;

  // Real-time Ethiopian Tax Calculations
  const taxCalculations = useMemo(() => {
    const taxableField = formData.isFieldAllowanceTaxable ? fieldAllowanceNum : 0;
    const nonTaxableField = formData.isFieldAllowanceTaxable ? 0 : fieldAllowanceNum;

    const totalTaxableAllowances = taxableAllowanceNum + taxableField;
    const totalNonTaxableAllowances = nonTaxableAllowanceNum + nonTaxableField;
    const totalAllowances = totalTaxableAllowances + totalNonTaxableAllowances;

    // Taxable gross for Income Tax Schedule A
    const taxableGross = baseSalaryNum + totalTaxableAllowances;
    const totalGrossSalary = baseSalaryNum + totalAllowances;

    // Ethiopian Employment Income Tax
    const incomeTax = calculateEthiopianIncomeTax(taxableGross);
    const activeBracketRate = getTaxBracketRate(taxableGross);

    // Pensions (calculated strictly on base salary according to Ethiopian law)
    const pensionEmployee = calculateEmployeePension(baseSalaryNum); // 7%
    const pensionEmployer = calculateEmployerPension(baseSalaryNum); // 11%
    const totalPension = Math.round((pensionEmployee + pensionEmployer) * 100) / 100;

    // Total employee deductions and net pay
    const totalEmployeeDeductions = Math.round((incomeTax + pensionEmployee) * 100) / 100;
    const estimatedNetSalary = Math.max(0, Math.round((totalGrossSalary - totalEmployeeDeductions) * 100) / 100);

    return {
      baseSalary: baseSalaryNum,
      fieldAllowance: fieldAllowanceNum,
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
  }, [
    baseSalaryNum,
    fieldAllowanceNum,
    formData.isFieldAllowanceTaxable,
    taxableAllowanceNum,
    nonTaxableAllowanceNum,
  ]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }
    if (formData.salary && isNaN(parseFloat(formData.salary))) {
      newErrors.salary = 'Base salary must be a number';
    }
    if (formData.fieldAllowance && isNaN(parseFloat(formData.fieldAllowance))) {
      newErrors.fieldAllowance = 'Field allowance must be a number';
    }
    if (formData.taxableAllowance && isNaN(parseFloat(formData.taxableAllowance))) {
      newErrors.taxableAllowance = 'Taxable allowance must be a number';
    }
    if (formData.nonTaxableAllowance && isNaN(parseFloat(formData.nonTaxableAllowance))) {
      newErrors.nonTaxableAllowance = 'Non-taxable allowance must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          baseSalary: baseSalaryNum,
          allowances: taxCalculations.totalAllowances,
          fieldAllowance: fieldAllowanceNum,
          taxableAllowance: taxableAllowanceNum,
          nonTaxableAllowance: nonTaxableAllowanceNum,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update employee');
      }

      alert('Employee updated successfully!');
      router.push(`/dashboard/employees/${employeeId}`);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setErrors({ submit: error.message || 'Failed to update employee' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/employees/${employeeId}`);
  };

  const handleDelete = async () => {
    const empName = `${formData.firstName} ${formData.lastName}`.trim() || 'this employee';
    const empCode = formData.employeeId ? ` (${formData.employeeId})` : '';
    if (!confirm(`Are you sure you want to delete ${empName}${empCode}?\n\nThis action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete employee');
      }
      alert(data.message || 'Employee deleted successfully');
      router.push('/dashboard/employees');
    } catch (err: any) {
      console.error('Error deleting employee:', err);
      alert(err.message || 'Failed to delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 text-sm">Loading employee details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={() => router.push('/dashboard/employees')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Employees
        </button>
        <span>/</span>
        <button
          onClick={handleCancel}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          {formData.firstName} {formData.lastName}
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">Edit</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Edit Employee</h1>
          <p className="text-slate-600 mt-2">Update employee personal details, employment terms, and base salary</p>
        </div>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={handleDelete}
          isLoading={isDeleting}
          className="flex items-center gap-1.5"
        >
          <Trash2 className="w-4 h-4" /> Delete Employee
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                error={errors.firstName}
                placeholder="e.g., John"
                required
              />
              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                error={errors.lastName}
                placeholder="e.g., Doe"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Middle Name"
                name="middleName"
                value={formData.middleName}
                onChange={handleInputChange}
                placeholder="e.g., Robert (Optional)"
              />
              <Input
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name (Amharic)"
                name="firstNameAm"
                value={formData.firstNameAm}
                onChange={handleInputChange}
                placeholder="e.g., ዮሐንስ (Optional)"
              />
              <Input
                label="Last Name (Amharic)"
                name="lastNameAm"
                value={formData.lastNameAm}
                onChange={handleInputChange}
                placeholder="e.g., በቀለ (Optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                options={[
                  { value: '', label: 'Select Gender' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                ]}
              />
              <Input
                label="National ID / TIN"
                name="tin"
                value={formData.tin}
                onChange={handleInputChange}
                placeholder="e.g., 0012345678 (Optional)"
              />
            </div>
          </CardBody>
        </Card>

        {/* Contact Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Contact Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                placeholder="john@example.com"
                required
              />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                error={errors.phone}
                placeholder="+251911223344"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Address / Location"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="e.g., Addis Ababa, Bole Sub-City"
              />
              <Input
                label="Pension Number"
                name="pensionNo"
                value={formData.pensionNo}
                onChange={handleInputChange}
                placeholder="e.g., PEN-998822 (Optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Emergency Contact Name"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleInputChange}
                placeholder="e.g., Mary Doe (Spouse)"
              />
              <Input
                label="Emergency Contact Phone"
                name="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={handleInputChange}
                placeholder="e.g., +251 92 987 6543"
              />
            </div>
          </CardBody>
        </Card>

        {/* Employment Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Employment Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Employee ID / Number"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <Select
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                options={[
                  { value: '', label: 'Select Department' },
                  { value: 'Management', label: 'Management' },
                  { value: 'Sales', label: 'Sales' },
                  { value: 'Finance', label: 'Finance' },
                  { value: 'HR', label: 'Human Resources' },
                  { value: 'Operations', label: 'Operations' },
                  { value: 'Logistics', label: 'Logistics' },
                  { value: 'Procurement', label: 'Procurement' },
                  { value: 'Warehouse', label: 'Warehouse' },
                  { value: 'IT', label: 'IT' },
                  { value: 'Medical', label: 'Medical' },
                ]}
              />
              <Select
                label="Employment Type"
                name="employmentType"
                value={formData.employmentType}
                onChange={handleInputChange}
                options={[
                  { value: 'Permanent', label: 'Permanent' },
                  { value: 'Contract', label: 'Contract' },
                  { value: 'PartTime', label: 'Part Time' },
                  { value: 'Intern', label: 'Intern' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                placeholder="e.g., Operations Manager, Sales Representative"
              />
              <Input
                label="Hire Date"
                name="hireDate"
                type="date"
                value={formData.hireDate}
                onChange={handleInputChange}
              />
            </div>
          </CardBody>
        </Card>

        {/* Salary & Allowances Section */}
        <Card className="border-indigo-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-indigo-50/50 border-b border-indigo-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Salary & Allowances</h2>
                  <p className="text-xs text-slate-500">
                    Enter base salary and allowances to automatically calculate Ethiopian Employment Tax
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Ethiopian Tax Schedule 'A'
              </span>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Salary & Allowances Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Base Salary */}
              <div className="space-y-1">
                <Input
                  label="Base Salary (ETB) *"
                  name="salary"
                  type="number"
                  step="0.01"
                  value={formData.salary}
                  onChange={handleInputChange}
                  error={errors.salary}
                  placeholder="e.g., 25000.00"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Subject to 7% Employee & 11% Employer Pension
                </p>
              </div>

              {/* Field Allowance */}
              <div className="space-y-2">
                <Input
                  label="Field Allowance (ETB)"
                  name="fieldAllowance"
                  type="number"
                  step="0.01"
                  value={formData.fieldAllowance}
                  onChange={handleInputChange}
                  error={errors.fieldAllowance}
                  placeholder="e.g., 5000.00"
                />
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    name="isFieldAllowanceTaxable"
                    checked={formData.isFieldAllowanceTaxable}
                    onChange={handleInputChange}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>
                    Field Allowance is <strong>Taxable</strong> (Uncheck if tax-exempt per diem/field policy)
                  </span>
                </label>
              </div>

              {/* Taxable Allowances (Housing, Position, Representation) */}
              <div className="space-y-1">
                <Input
                  label="Taxable Allowance (Housing / Position) (ETB)"
                  name="taxableAllowance"
                  type="number"
                  step="0.01"
                  value={formData.taxableAllowance}
                  onChange={handleInputChange}
                  error={errors.taxableAllowance}
                  placeholder="e.g., 3000.00"
                />
                <p className="text-[11px] text-slate-500">
                  Subject to Ethiopian Employment Income Tax
                </p>
              </div>

              {/* Non-Taxable Allowances (Transport / Per Diem up to legal threshold) */}
              <div className="space-y-1">
                <Input
                  label="Tax-Exempt Allowance (Transport / Non-Taxable) (ETB)"
                  name="nonTaxableAllowance"
                  type="number"
                  step="0.01"
                  value={formData.nonTaxableAllowance}
                  onChange={handleInputChange}
                  error={errors.nonTaxableAllowance}
                  placeholder="e.g., 2000.00"
                />
                <p className="text-[11px] text-slate-500">
                  Exempt from employment income tax & pension
                </p>
              </div>
            </div>

            {/* Live Ethiopian Tax & Net Salary Breakdown Card */}
            <div className="mt-6 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-5 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-base">
                    Estimated Ethiopian Payroll & Tax Calculation
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Active Tax Bracket:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
                    {taxCalculations.activeBracketRate}
                  </span>
                </div>
              </div>

              {/* Key Financial Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
                    Gross Salary
                  </span>
                  <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
                    {formatETB(taxCalculations.totalGrossSalary)}
                    <span className="text-xs font-normal text-slate-500 ml-1">ETB</span>
                  </p>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Base + All Allowances
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
                    Taxable Gross
                  </span>
                  <p className="text-lg font-bold text-indigo-700 mt-1 font-mono">
                    {formatETB(taxCalculations.taxableGross)}
                    <span className="text-xs font-normal text-slate-500 ml-1">ETB</span>
                  </p>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Subject to Income Tax
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-amber-200 bg-amber-50/30 shadow-xs">
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide block">
                    Income Tax (Tax Allowance)
                  </span>
                  <p className="text-lg font-bold text-amber-700 mt-1 font-mono">
                    {formatETB(taxCalculations.incomeTax)}
                    <span className="text-xs font-normal text-slate-500 ml-1">ETB</span>
                  </p>
                  <span className="text-[11px] text-amber-600 block mt-0.5">
                    Ethiopian Schedule 'A'
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/40 shadow-xs">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide block">
                    Estimated Net Pay
                  </span>
                  <p className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">
                    {formatETB(taxCalculations.estimatedNetSalary)}
                    <span className="text-xs font-normal text-emerald-700 ml-1">ETB</span>
                  </p>
                  <span className="text-[11px] text-emerald-600 block mt-0.5">
                    Take-Home Monthly Pay
                  </span>
                </div>
              </div>

              {/* Pension & Deductions Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600">Employee Pension (7%):</span>
                  <span className="font-bold font-mono text-slate-900">
                    {formatETB(taxCalculations.pensionEmployee)} ETB
                  </span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-600">Employer Pension (11%):</span>
                  <span className="font-bold font-mono text-slate-900">
                    {formatETB(taxCalculations.pensionEmployer)} ETB
                  </span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-rose-200 text-rose-800 flex items-center justify-between">
                  <span className="font-medium">Total Employee Deductions:</span>
                  <span className="font-bold font-mono text-rose-700">
                    -{formatETB(taxCalculations.totalEmployeeDeductions)} ETB
                  </span>
                </div>
              </div>

              {/* Ethiopian Income Tax Schedule Reference Table */}
              <div className="border-t border-indigo-100 pt-3">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Ethiopian Employment Income Tax Schedule Reference:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {ETHIOPIAN_TAX_BRACKETS.map((bracket, idx) => {
                    const isActive =
                      taxCalculations.taxableGross >= bracket.min &&
                      (bracket.max === Infinity
                        ? taxCalculations.taxableGross > 14000
                        : taxCalculations.taxableGross <= bracket.max);

                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-300'
                            : 'bg-white/90 text-slate-700 border-slate-200 opacity-75'
                        }`}
                      >
                        <div className="text-[10px] font-medium tracking-tight">
                          {bracket.rangeLabel} ETB
                        </div>
                        <div className="text-sm font-extrabold mt-0.5">
                          {bracket.label}
                        </div>
                        <div
                          className={`text-[9px] mt-0.5 ${
                            isActive ? 'text-indigo-100' : 'text-slate-400'
                          }`}
                        >
                          {bracket.deduction > 0 ? `-${bracket.deduction} ETB` : 'No deduct'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Bank Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Bank Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Bank Name"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                placeholder="e.g., Commercial Bank of Ethiopia (CBE), Awash Bank"
              />

              <Input
                label="Bank Account Number"
                name="bankAccount"
                value={formData.bankAccount}
                onChange={handleInputChange}
                placeholder="e.g., 100012345678"
              />
            </div>
          </CardBody>
        </Card>

        {/* Status Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Status</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </CardBody>
        </Card>

        {/* Buttons */}
        <Card>
          <CardFooter className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
              >
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
            <Button
              type="button"
              variant="danger"
              size="lg"
              onClick={handleDelete}
              isLoading={isDeleting}
              className="flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Delete Employee
            </Button>
          </CardFooter>
        </Card>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {errors.submit}
          </div>
        )}
      </form>
    </div>
  );
}
