'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button, Input } from '@/components/ui';

interface JournalLine {
  id: number;
  account: string;
  debit: number;
  credit: number;
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { id: 1, account: '', debit: 0, credit: 0 },
    { id: 2, account: '', debit: 0, credit: 0 },
  ]);

  const handleAddLine = () => {
    const newId = Math.max(...lines.map(l => l.id), 0) + 1;
    setLines([...lines, { id: newId, account: '', debit: 0, credit: 0 }]);
  };

  const handleRemoveLine = (id: number) => {
    if (lines.length > 2) {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  const handleLineChange = (id: number, field: string, value: any) => {
    setLines(lines.map(line =>
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSave = async () => {
    if (!description || !referenceNumber || lines.some(l => !l.account) || !isBalanced) {
      alert('Please fill in all fields and ensure debits equal credits');
      return;
    }
    try {
      const res = await fetch('/api/finance/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: entryDate, description, referenceNumber, lines }),
      });
      const d = await res.json();
      if (!d.success) { alert(d.error || 'Failed'); return; }
      alert('Journal Entry saved successfully!');
      router.push('/dashboard/finance/journal');
    } catch {
      alert('Failed to save journal entry');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/finance/journal');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">New Journal Entry</h1>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Entry Details</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
              <Input
                placeholder="e.g., JNL-001"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
              placeholder="Enter transaction description..."
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Journal Lines</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddLine}
            >
              + Add Line
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Account</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Debit</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Credit</th>
                  <th className="text-left py-2 px-2 text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="py-3 px-2">
                      <Input
                        placeholder="Enter account name"
                        value={line.account}
                        onChange={(e) => handleLineChange(line.id, 'account', e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        step="0.01"
                        value={line.debit}
                        onChange={(e) => handleLineChange(line.id, 'debit', parseFloat(e.target.value))}
                        className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="number"
                        step="0.01"
                        value={line.credit}
                        onChange={(e) => handleLineChange(line.id, 'credit', parseFloat(e.target.value))}
                        className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-2 py-1"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveLine(line.id)}
                        disabled={lines.length <= 2}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-end gap-8">
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Debit:</div>
                <div className="text-lg font-bold text-gray-900">
                  ETB {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Credit:</div>
                <div className="text-lg font-bold text-gray-900">
                  ETB {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Balance Check:</div>
                <div className={`text-lg font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {isBalanced ? 'Balanced' : 'Not Balanced'}
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          className="flex-1"
          disabled={!isBalanced}
        >
          Save Journal Entry
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={handleCancel}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
