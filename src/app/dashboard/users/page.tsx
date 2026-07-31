'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge, Input, Select, Modal, ConfirmDialog } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export default function UsersPage() {
  const router = useRouter();
  const { data: users, loading, error, refetch } = useApiList('/api/users');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filteredUsers = users.filter((user: User) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const statusColorMap: Record<string, any> = {
    ACTIVE: 'success',
    INACTIVE: 'danger',
    SUSPENDED: 'warning',
  };

  const handleView = (user: User) => {
    router.push(`/dashboard/users/${user.id}`);
  };

  const handleEdit = (user: User) => {
    router.push(`/dashboard/users/${user.id}/edit`);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      setDeleting(true);
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete user');
      }
      alert('User deleted successfully');
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
        <Button variant="primary" size="lg" onClick={() => router.push('/dashboard/users/new')}>
          + Add User
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <div className="space-y-2">
              <p className="text-slate-600 text-sm">Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="space-y-2">
              <p className="text-slate-600 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-green-600">
                {users.filter((u: User) => u.status === 'ACTIVE').length}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="space-y-2">
              <p className="text-slate-600 text-sm">Inactive Users</p>
              <p className="text-2xl font-bold text-slate-600">
                {users.filter((u: User) => u.status === 'INACTIVE').length}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="space-y-2">
              <p className="text-slate-600 text-sm">Suspended Users</p>
              <p className="text-2xl font-bold text-red-600">
                {users.filter((u: User) => u.status === 'SUSPENDED').length}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search Card */}
      <Card>
        <CardBody>
          <Input
            placeholder="Search by username, name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="mt-2 text-sm text-slate-600">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardBody>
      </Card>

      {/* Users Table */}
      <Card>
        <CardBody>
          {filteredUsers.length === 0 ? (
            <p className="text-center text-slate-600 py-8">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Username</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Department</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map((user: User) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-900">{user.username}</td>
                      <td className="px-4 py-3 text-slate-900">
                        {user.firstName} {user.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3 text-slate-900">{user.role}</td>
                      <td className="px-4 py-3 text-slate-900">{user.department}</td>
                      <td className="px-4 py-3">
                        <Badge status={statusColorMap[user.status]}>{user.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(user)}
                          >
                            View
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteConfirm(true);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm && !!selectedUser}
        title="Delete User"
        message={selectedUser ? `Are you sure you want to delete ${selectedUser.firstName} ${selectedUser.lastName}?` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedUser(null);
        }}
        isDangerous={true}
        isLoading={deleting}
      />
    </div>
  );
}
