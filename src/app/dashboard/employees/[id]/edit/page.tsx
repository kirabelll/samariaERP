'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';
import { DollarSign, Trash2 } from 'lucide-react';

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

        {/* Salary Information Section */}
        <Card className="border-indigo-100">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-600 text-white">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Salary Information</h2>
                <p className="text-xs text-slate-500">Configure monthly base salary</p>
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
