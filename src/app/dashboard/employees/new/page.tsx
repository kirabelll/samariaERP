'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';
import { DollarSign, Award, Phone, Truck, PlusCircle } from 'lucide-react';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeId: string;
  department: string;
  position: string;
  hireDate: string;
  salary: string; // Base Salary
  transportAllowance: string;
  positionAllowance: string;
  phoneAllowance: string;
  otherAllowance: string;
  bankName: string;
  bankAccount: string;
  status: 'Active' | 'Inactive';
}

interface FormErrors {
  [key: string]: string;
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employeeId: '',
    department: '',
    position: '',
    hireDate: '',
    salary: '',
    transportAllowance: '',
    positionAllowance: '',
    phoneAllowance: '',
    otherAllowance: '',
    bankName: '',
    bankAccount: '',
    status: 'Active',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'Employee ID is required';
    }
    if (formData.salary && isNaN(parseFloat(formData.salary))) {
      newErrors.salary = 'Base salary must be a number';
    }
    if (formData.transportAllowance && isNaN(parseFloat(formData.transportAllowance))) {
      newErrors.transportAllowance = 'Transport allowance must be a number';
    }
    if (formData.positionAllowance && isNaN(parseFloat(formData.positionAllowance))) {
      newErrors.positionAllowance = 'Position allowance must be a number';
    }
    if (formData.phoneAllowance && isNaN(parseFloat(formData.phoneAllowance))) {
      newErrors.phoneAllowance = 'Phone allowance must be a number';
    }
    if (formData.otherAllowance && isNaN(parseFloat(formData.otherAllowance))) {
      newErrors.otherAllowance = 'Other allowance must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const baseSalaryNum = parseFloat(formData.salary) || 0;
  const transportNum = parseFloat(formData.transportAllowance) || 0;
  const positionNum = parseFloat(formData.positionAllowance) || 0;
  const phoneNum = parseFloat(formData.phoneAllowance) || 0;
  const otherNum = parseFloat(formData.otherAllowance) || 0;
  const totalAllowances = transportNum + positionNum + phoneNum + otherNum;
  const totalGrossSalary = baseSalaryNum + totalAllowances;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          baseSalary: baseSalaryNum,
          transportAllowance: transportNum,
          positionAllowance: positionNum,
          phoneAllowance: phoneNum,
          otherAllowance: otherNum,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create employee');
      alert('Employee created successfully!');
      router.push('/dashboard/employees');
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setErrors({ submit: error.message || 'Failed to create employee' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/employees');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleCancel}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Employees
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">New Employee</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Create New Employee</h1>
        <p className="text-slate-600 mt-2">Fill in personal details, employment terms, base salary, and allowances</p>
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
          </CardBody>
        </Card>

        {/* Employment Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Employment Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Employee ID"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                error={errors.employeeId}
                placeholder="e.g., EMP001"
                required
              />
              <Select
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                options={[
                  { value: 'HR', label: 'Human Resources' },
                  { value: 'Finance', label: 'Finance' },
                  { value: 'Operations', label: 'Operations' },
                  { value: 'Sales', label: 'Sales' },
                  { value: 'Warehouse', label: 'Warehouse' },
                  { value: 'IT', label: 'IT' },
                  { value: 'Management', label: 'Management' },
                  { value: 'Logistics', label: 'Logistics' },
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
        <Card className="border-indigo-100">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-600 text-white">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Salary & Allowances</h2>
                <p className="text-xs text-slate-500">Configure base salary and monthly allowances (Transport, Position, Phone)</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Base Salary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <Input
                label="Transport Allowance (ETB)"
                name="transportAllowance"
                type="number"
                step="0.01"
                value={formData.transportAllowance}
                onChange={handleInputChange}
                error={errors.transportAllowance}
                placeholder="e.g., 3000.00"
              />
            </div>

            {/* Position, Phone, and Other Allowances */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Position Allowance (ETB)"
                name="positionAllowance"
                type="number"
                step="0.01"
                value={formData.positionAllowance}
                onChange={handleInputChange}
                error={errors.positionAllowance}
                placeholder="e.g., 5000.00"
              />
              <Input
                label="Phone Allowance (ETB)"
                name="phoneAllowance"
                type="number"
                step="0.01"
                value={formData.phoneAllowance}
                onChange={handleInputChange}
                error={errors.phoneAllowance}
                placeholder="e.g., 1000.00"
              />
              <Input
                label="Other Allowance (ETB)"
                name="otherAllowance"
                type="number"
                step="0.01"
                value={formData.otherAllowance}
                onChange={handleInputChange}
                error={errors.otherAllowance}
                placeholder="e.g., 500.00"
              />
            </div>

            {/* Total Compensation Summary Box */}
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 p-4 rounded-xl border border-indigo-100/80">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                Monthly Compensation Breakdown
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block">Base Salary:</span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    ETB {baseSalaryNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 block">Total Allowances:</span>
                  <span className="text-base font-bold text-indigo-600 font-mono">
                    ETB {totalAllowances.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-indigo-200 sm:col-span-2">
                  <span className="text-xs text-indigo-700 font-medium block">Total Gross Monthly Compensation:</span>
                  <span className="text-xl font-extrabold text-indigo-950 font-mono">
                    ETB {totalGrossSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
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
          <CardFooter>
            <div className="flex gap-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
              >
                Save Employee
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
