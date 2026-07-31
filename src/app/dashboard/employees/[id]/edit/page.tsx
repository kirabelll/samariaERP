'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeId: string;
  department: string;
  position: string;
  hireDate: string;
  salary: string;
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
  const employeeId = params?.id;

  // Mock data - replace with actual API call
  const [formData, setFormData] = useState<FormData>({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+251911223344',
    employeeId: 'EMP001',
    department: 'Operations',
    position: 'Manager',
    hireDate: '2023-01-15',
    salary: '25000',
    bankName: 'Commercial Bank of Ethiopia',
    bankAccount: '1234567890',
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
      newErrors.salary = 'Salary must be a number';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('Form submitted:', formData);
      alert('Employee updated successfully!');
      router.push('/dashboard/employees');
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Failed to update employee' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/employees');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleCancel}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Employees
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">
          {formData.firstName} {formData.lastName}
        </span>
        <span>/</span>
        <span className="text-slate-900 font-medium">Edit</span>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit Employee</h1>
        <p className="text-slate-600 mt-2">Update employee information and details</p>
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
                ]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                placeholder="e.g., Manager, Operator"
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

        {/* Salary Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Salary Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <Input
              label="Salary (ETB)"
              name="salary"
              type="number"
              value={formData.salary}
              onChange={handleInputChange}
              error={errors.salary}
              placeholder="0.00"
            />
          </CardBody>
        </Card>

        {/* Bank Information Section */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold text-slate-900">Bank Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <Input
              label="Bank Name"
              name="bankName"
              value={formData.bankName}
              onChange={handleInputChange}
              placeholder="e.g., Commercial Bank of Ethiopia"
            />

            <Input
              label="Bank Account Number"
              name="bankAccount"
              value={formData.bankAccount}
              onChange={handleInputChange}
              placeholder="e.g., 1234567890"
            />
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
                Update Employee
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
