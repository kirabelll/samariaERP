'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button, Input, Select } from '@/components/ui';

interface Account {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  parentId: string | null;
  isActive: boolean;
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/finance/accounts/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAccount(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/finance/accounts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      });
      const d = await res.json();
      if (d.success) {
        alert('Account updated successfully!');
        router.push('/dashboard/finance/accounts');
      } else {
        alert(d.error || 'Failed to update');
      }
    } catch {
      alert('Failed to update account');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!account) return <div className="p-8 text-center text-red-500">Account not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/finance/accounts" className="text-blue-600 hover:text-blue-800">Chart of Accounts</Link>
        <span>/</span>
        <span>{account.accountCode}</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Edit Account: {account.accountName}</h1>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">Account Details</h2></CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Code</label>
              <input
                value={account.accountCode}
                onChange={(e) => setAccount({ ...account, accountCode: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
              <input
                value={account.accountName}
                onChange={(e) => setAccount({ ...account, accountName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
              <select
                value={account.accountType}
                onChange={(e) => setAccount({ ...account, accountType: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
                <option value="Revenue">Revenue</option>
                <option value="Expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={account.isActive ? 'active' : 'inactive'}
                onChange={(e) => setAccount({ ...account, isActive: e.target.value === 'active' })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex gap-3 justify-end">
        <Link href="/dashboard/finance/accounts">
          <Button variant="outline" size="lg">Cancel</Button>
        </Link>
        <Button variant="primary" size="lg" onClick={handleSave} isLoading={saving}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
