'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

interface FormData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  department: string;
  role: string;
  status: string;
  telegramChatId: string;
}

interface FormErrors {
  [key: string]: string;
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'PROCUREMENT', label: 'Procurement' },
  { value: 'SALES', label: 'Sales' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'HR', label: 'HR' },
  { value: 'MEDICAL_PHARMACIST', label: 'Medical Pharmacist' },
  { value: 'MEDICAL_DRUGGIST', label: 'Medical Druggist' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'AUDITOR', label: 'Auditor' },
  { value: 'USER', label: 'User' },
  { value: 'PORTAL_CUSTOMER', label: 'Portal Customer' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const DEPARTMENT_OPTIONS = [
  { value: '', label: 'Select Department' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Procurement', label: 'Procurement' },
  { value: 'HR', label: 'Human Resources' },
  { value: 'IT', label: 'IT' },
  { value: 'Medical', label: 'Medical' },
  { value: 'Warehouse', label: 'Warehouse' },
];

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const userId = params?.id as string;
  const currentUserRole = (session?.user as any)?.role;
  const currentUserId = (session?.user as any)?.id;
  const isAdmin = currentUserRole === 'ADMIN';
  const isEditingSelf = currentUserId === userId;

  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    department: '',
    role: 'USER',
    status: 'ACTIVE',
    telegramChatId: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Failed to fetch user');
        const u = result.data;
        setFormData({
          username: u.username || '',
          email: u.email || '',
          password: '',
          firstName: u.firstName || '',
          middleName: u.middleName || '',
          lastName: u.lastName || '',
          phone: u.phone || '',
          department: u.department || '',
          role: u.role || 'USER',
          status: u.status || 'ACTIVE',
          telegramChatId: u.telegramChatId || '',
        });
      } catch (err) {
        console.error('Error fetching user:', err);
        setErrors({ fetch: 'Failed to load user data' });
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchUser();
  }, [userId]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (formData.password && formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload: any = { ...formData };
      if (!payload.password) delete payload.password;

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update user');
      alert('User updated successfully!');
      router.push(`/dashboard/users/${userId}`);
    } catch (error) {
      console.error('Error updating user:', error);
      setErrors({ submit: 'Failed to update user' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => router.push(`/dashboard/users/${userId}`);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button onClick={() => router.push('/dashboard/users')} className="text-blue-600 hover:text-blue-700 font-medium">Users</button>
        <span>/</span>
        <button onClick={handleCancel} className="text-blue-600 hover:text-blue-700 font-medium">{formData.firstName} {formData.lastName}</button>
        <span>/</span>
        <span className="text-slate-900 font-medium">Edit</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit User</h1>
        <p className="text-slate-600 mt-2">Update user information. Leave password blank to keep current password.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><h2 className="text-xl font-bold text-slate-900">Account Information</h2></CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Username" name="username" value={formData.username} onChange={handleInputChange} error={errors.username} required />
              <Input label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} error={errors.email} required />
            </div>
            {(isAdmin || isEditingSelf) && (
              <Input label="New Password (leave blank to keep current)" name="password" type="password" value={formData.password} onChange={handleInputChange} error={errors.password} placeholder="Enter new password (optional)" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-xl font-bold text-slate-900">Personal Information</h2></CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input label="First Name" name="firstName" value={formData.firstName} onChange={handleInputChange} error={errors.firstName} required />
              <Input label="Middle Name" name="middleName" value={formData.middleName} onChange={handleInputChange} />
              <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleInputChange} error={errors.lastName} required />
            </div>
            <Input label="Phone Number" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="+251911223344" />
            <Input label="Telegram Chat ID" name="telegramChatId" value={formData.telegramChatId} onChange={handleInputChange} placeholder="e.g., 123456789" />
            <p className="text-xs text-gray-500 -mt-4">User can get their Chat ID by messaging <b>@wonde_samaria</b> on Telegram and sending <code>/start</code></p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-xl font-bold text-slate-900">Role & Department</h2></CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Select label="Role" name="role" value={formData.role} onChange={handleInputChange} options={ROLE_OPTIONS} />
              <Select label="Department" name="department" value={formData.department} onChange={handleInputChange} options={DEPARTMENT_OPTIONS} />
              <Select label="Status" name="status" value={formData.status} onChange={handleInputChange} options={STATUS_OPTIONS} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardFooter>
            <div className="flex gap-4">
              <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>Save Changes</Button>
              <Button type="button" variant="outline" size="lg" onClick={handleCancel}>Cancel</Button>
            </div>
          </CardFooter>
        </Card>

        {errors.submit && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{errors.submit}</div>}
        {errors.fetch && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{errors.fetch}</div>}
      </form>
    </div>
  );
}
