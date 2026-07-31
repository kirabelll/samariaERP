'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select } from '@/components/ui';

export default function NewAccountPage() {
  const router = useRouter();
  const [accountCode, setAccountCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [parentId, setParentId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountCode || !accountName || !accountType) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/finance/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountCode,
          accountName,
          accountType,
          parentId: parentId || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save account');
      }

      alert('Account saved successfully!');
      router.push('/dashboard/finance/accounts');
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">New Chart of Account</h1>
        <Link href="/dashboard/finance/accounts" className="text-blue-600 hover:text-blue-800">
          &larr; Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Code *</label>
                <Input
                  placeholder="e.g., 1000"
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Name *</label>
                <Input
                  placeholder="e.g., Cash"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Type *</label>
                <Select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  options={[
                    { value: '', label: 'Select Type' },
                    { value: 'Asset', label: 'Asset' },
                    { value: 'Liability', label: 'Liability' },
                    { value: 'Equity', label: 'Equity' },
                    { value: 'Revenue', label: 'Revenue' },
                    { value: 'Expense', label: 'Expense' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parent Account ID</label>
                <Input
                  placeholder="e.g., 1000 (optional)"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Parent Account ID links this account to a parent account for hierarchical organization.
              </p>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Account Summary</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Account Code:</span>
              <span className="font-medium">{accountCode || 'Not set'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Account Name:</span>
              <span className="font-medium">{accountName || 'Not set'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Account Type:</span>
              <span className="font-medium">{accountType || 'Not set'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Parent Account:</span>
              <span className="font-medium">{parentId || 'None'}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={(e) => {
            const form = document.querySelector('form');
            if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
          }}
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Saving...' : 'Save Account'}
        </Button>
        <Link href="/dashboard/finance/accounts" className="flex-1">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
          >
            Cancel
          </Button>
        </Link>
      </div>
    </div>
  );
}
