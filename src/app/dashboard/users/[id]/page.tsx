'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Badge } from '@/components/ui';
import { Shield } from 'lucide-react';

interface UserData {
  id: string;
  username: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  role: string;
  department?: string;
  branch?: string;
  status: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  permissions?: Array<{
    id: string;
    module: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
  }>;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  PROCUREMENT: 'Procurement',
  SALES: 'Sales',
  FINANCE: 'Finance',
  HR: 'HR',
  MEDICAL_PHARMACIST: 'Medical Pharmacist',
  MEDICAL_DRUGGIST: 'Medical Druggist',
  WAREHOUSE: 'Warehouse',
  AUDITOR: 'Auditor',
  USER: 'User',
  PORTAL_CUSTOMER: 'Portal Customer',
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}`);
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch user');
        }
        setUser(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchUser();
  }, [userId]);

  const handleEdit = () => router.push(`/dashboard/users/${userId}/edit`);
  const handleBack = () => router.push('/dashboard/users');

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

  if (error || !user) {
    return (
      <div className="space-y-6">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">
          &larr; Back to Users
        </button>
        <Card>
          <CardBody>
            <p className="text-red-600">{error || 'User not found'}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button onClick={handleBack} className="text-blue-600 hover:text-blue-800 font-medium">Users</button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{fullName}</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">{fullName}</h1>
        <p className="text-slate-600 mt-2">@{user.username}</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{fullName}</h2>
            <div className="mt-2">
              <Badge status={user.status === 'ACTIVE' ? 'Active' : user.status === 'SUSPENDED' ? 'Pending' : 'Rejected'}>
                {user.status}
              </Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={`/dashboard/users/${userId}/permissions`}>
              <Button variant="outline" size="lg">
                <Shield className="w-4 h-4 mr-1" /> Permissions
              </Button>
            </Link>
            <Button variant="primary" size="lg" onClick={handleEdit}>Edit</Button>
            <Button variant="outline" size="lg" onClick={handleBack}>Back</Button>
          </div>
        </CardHeader>

        <CardBody className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Username</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{user.username}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{user.email}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{ROLE_LABELS[user.role] || user.role}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{user.status}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">First Name</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{user.firstName}</p>
              </div>
              {user.middleName && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Middle Name</label>
                  <p className="text-lg font-medium text-slate-900 mt-1">{user.middleName}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Name</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{user.lastName}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{user.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Department & Branch</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{user.department || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Branch</label>
                <p className="text-lg font-medium text-slate-900 mt-1">{user.branch || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Login</label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-US') : 'Never'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</label>
                <p className="text-lg font-medium text-slate-900 mt-1">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {user.permissions && user.permissions.length > 0 && (
            <div className="border-t border-slate-200 pt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Permissions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Module</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">View</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Create</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Edit</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Delete</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Approve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.permissions.map((perm) => (
                      <tr key={perm.id} className="border-b border-slate-100">
                        <td className="px-4 py-2 text-slate-900 font-medium">{perm.module}</td>
                        <td className="px-4 py-2 text-center">{perm.canView ? '\u2713' : '\u2014'}</td>
                        <td className="px-4 py-2 text-center">{perm.canCreate ? '\u2713' : '\u2014'}</td>
                        <td className="px-4 py-2 text-center">{perm.canEdit ? '\u2713' : '\u2014'}</td>
                        <td className="px-4 py-2 text-center">{perm.canDelete ? '\u2713' : '\u2014'}</td>
                        <td className="px-4 py-2 text-center">{perm.canApprove ? '\u2713' : '\u2014'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
