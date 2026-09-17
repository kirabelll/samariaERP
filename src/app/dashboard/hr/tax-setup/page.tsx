'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody, CardFooter, Table, Badge, Button, Input, Modal } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';

interface TaxBracket {
  id: number;
  minIncome: number;
  maxIncome: number;
  rate: number;
  deductionAmount: number;
  effectiveFrom: string;
  status: 'Active' | 'Inactive';
}

interface PensionRate {
  id: number;
  type: 'Employee' | 'Employer';
  percentage: number;
  effectiveFrom: string;
  description: string;
  status: 'Active' | 'Inactive';
}

interface ChangeHistory {
  id: number;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
}

const sampleTaxBrackets: TaxBracket[] = [
  {
    id: 1,
    minIncome: 0,
    maxIncome: 2000,
    rate: 0,
    deductionAmount: 0,
    effectiveFrom: '2024-01-01',
    status: 'Active',
  },
  {
    id: 2,
    minIncome: 2001,
    maxIncome: 4000,
    rate: 15,
    deductionAmount: 300,
    effectiveFrom: '2024-01-01',
    status: 'Active',
  },
  {
    id: 3,
    minIncome: 4001,
    maxIncome: 7000,
    rate: 20,
    deductionAmount: 500,
    effectiveFrom: '2024-01-01',
    status: 'Active',
  },
  {
    id: 4,
    minIncome: 7001,
    maxIncome: 10000,
    rate: 25,
    deductionAmount: 850,
    effectiveFrom: '2024-01-01',
    status: 'Active',
  },
  {
    id: 5,
    minIncome: 10001,
    maxIncome: 14000,
    rate: 30,
    deductionAmount: 1350,
    effectiveFrom: '2024-01-01',
    status: 'Active',
  },
  {
    id: 6,
    minIncome: 14001,
    maxIncome: 999999999,
    rate: 35,
    deductionAmount: 2050,
    effectiveFrom: '2024-01-01',
    status: 'Active',
  },
];

const samplePensionRates: PensionRate[] = [
  {
    id: 1,
    type: 'Employee',
    percentage: 7,
    effectiveFrom: '2024-01-01',
    description: 'Employee pension contribution (7% of gross salary)',
    status: 'Active',
  },
  {
    id: 2,
    type: 'Employer',
    percentage: 11,
    effectiveFrom: '2024-01-01',
    description: 'Employer pension contribution (11% of gross salary)',
    status: 'Active',
  },
];

const sampleChangeHistory: ChangeHistory[] = [
  {
    id: 1,
    field: 'Tax Bracket - 10% Rate',
    oldValue: 'Deduction Amount: 55',
    newValue: 'Deduction Amount: 60',
    changedBy: 'Admin User',
    changedAt: '2026-02-15 14:30',
  },
  {
    id: 2,
    field: 'Pension - Employee Rate',
    oldValue: '6.5%',
    newValue: '7%',
    changedBy: 'Admin User',
    changedAt: '2026-01-10 09:15',
  },
  {
    id: 3,
    field: 'Tax Bracket - 15% Rate',
    oldValue: 'Deduction Amount: 140',
    newValue: 'Deduction Amount: 142.5',
    changedBy: 'Admin User',
    changedAt: '2025-12-20 11:45',
  },
];

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function TaxSetupPage() {
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>(sampleTaxBrackets);
  const [pensionRates, setPensionRates] = useState<PensionRate[]>(samplePensionRates);
  const [changeHistory] = useState<ChangeHistory[]>(sampleChangeHistory);
  const [showEditTaxModal, setShowEditTaxModal] = useState(false);
  const [showEditPensionModal, setShowEditPensionModal] = useState(false);
  const [editingTaxBracket, setEditingTaxBracket] = useState<TaxBracket | null>(null);
  const [editingPensionRate, setEditingPensionRate] = useState<PensionRate | null>(null);

  const handleEditTaxBracket = (bracket: TaxBracket) => {
    setEditingTaxBracket({ ...bracket });
    setShowEditTaxModal(true);
  };

  const handleSaveTaxBracket = () => {
    if (editingTaxBracket) {
      setTaxBrackets((prev) =>
        prev.map((bracket) =>
          bracket.id === editingTaxBracket.id ? editingTaxBracket : bracket
        )
      );
      setShowEditTaxModal(false);
      setEditingTaxBracket(null);
    }
  };

  const handleEditPensionRate = (rate: PensionRate) => {
    setEditingPensionRate({ ...rate });
    setShowEditPensionModal(true);
  };

  const handleSavePensionRate = () => {
    if (editingPensionRate) {
      setPensionRates((prev) =>
        prev.map((rate) =>
          rate.id === editingPensionRate.id ? editingPensionRate : rate
        )
      );
      setShowEditPensionModal(false);
      setEditingPensionRate(null);
    }
  };

  const taxColumns: ColumnDef<TaxBracket>[] = [
    {
      header: 'Min Income',
      accessor: 'minIncome',
      render: (value) => formatCurrency(value as number),
    },
    {
      header: 'Max Income',
      accessor: 'maxIncome',
      render: (value) => {
        const max = value as number;
        return max === 999999999 ? 'Above 10,900' : formatCurrency(max);
      },
    },
    {
      header: 'Tax Rate (%)',
      accessor: 'rate',
      render: (value) => `${value}%`,
    },
    {
      header: 'Deduction Amount',
      accessor: 'deductionAmount',
      render: (value) => formatCurrency(value as number),
    },
    {
      header: 'Effective From',
      accessor: 'effectiveFrom',
      render: (date) => formatDate(date as string),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => (
        <Badge status={status === 'Active' ? 'Active' : 'Cancelled'}>
          {status as string}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => {
        const bracket = taxBrackets.find((b) => b.id === id);
        return bracket ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEditTaxBracket(bracket)}
          >
            Edit
          </Button>
        ) : null;
      },
    },
  ];

  const pensionColumns: ColumnDef<PensionRate>[] = [
    {
      header: 'Type',
      accessor: 'type',
      render: (type) => (
        <span className="font-semibold text-gray-900">{type}</span>
      ),
    },
    {
      header: 'Percentage',
      accessor: 'percentage',
      render: (value) => `${value}%`,
    },
    {
      header: 'Description',
      accessor: 'description',
    },
    {
      header: 'Effective From',
      accessor: 'effectiveFrom',
      render: (date) => formatDate(date as string),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => (
        <Badge status={status === 'Active' ? 'Active' : 'Cancelled'}>
          {status as string}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id) => {
        const rate = pensionRates.find((r) => r.id === id);
        return rate ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleEditPensionRate(rate)}
          >
            Edit
          </Button>
        ) : null;
      },
    },
  ];

  const historyColumns: ColumnDef<ChangeHistory>[] = [
    {
      header: 'Field Changed',
      accessor: 'field',
    },
    {
      header: 'Old Value',
      accessor: 'oldValue',
      render: (value) => <span className="text-red-600">{value}</span>,
    },
    {
      header: 'New Value',
      accessor: 'newValue',
      render: (value) => <span className="text-green-600">{value}</span>,
    },
    {
      header: 'Changed By',
      accessor: 'changedBy',
    },
    {
      header: 'Changed At',
      accessor: 'changedAt',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Tax & Pension Setup</h1>
        <p className="text-gray-600 mt-2">Configure tax brackets and pension rates</p>
      </div>

      {/* Tax Brackets Section */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-gray-900">Income Tax Brackets</h2>
          <p className="text-sm text-gray-600 mt-1">Ethiopian income tax configuration</p>
        </CardHeader>
        <CardBody>
          <Table<TaxBracket>
            data={taxBrackets}
            columns={taxColumns}
            emptyMessage="No tax brackets configured"
          />
        </CardBody>
        <CardFooter>
          <Button variant="secondary" size="sm">
            + Add New Bracket
          </Button>
        </CardFooter>
      </Card>

      {/* Pension Rates Section */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-gray-900">Pension Contribution Rates</h2>
          <p className="text-sm text-gray-600 mt-1">Employee and employer pension contributions</p>
        </CardHeader>
        <CardBody>
          <Table<PensionRate>
            data={pensionRates}
            columns={pensionColumns}
            emptyMessage="No pension rates configured"
          />
        </CardBody>
        <CardFooter>
          <Button variant="secondary" size="sm">
            + Add New Rate
          </Button>
        </CardFooter>
      </Card>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-gray-900 mb-4">Current Tax Configuration</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Tax Brackets Active:</span>
                <span className="font-semibold text-gray-900">
                  {taxBrackets.filter((b) => b.status === 'Active').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Highest Tax Rate:</span>
                <span className="font-semibold text-gray-900">
                  {Math.max(...taxBrackets.map((b) => b.rate))}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Minimum Taxable Income:</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(601)}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="font-semibold text-gray-900 mb-4">Current Pension Configuration</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Employee Contribution:</span>
                <span className="font-semibold text-gray-900">
                  {pensionRates.find((r) => r.type === 'Employee')?.percentage}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Employer Contribution:</span>
                <span className="font-semibold text-gray-900">
                  {pensionRates.find((r) => r.type === 'Employer')?.percentage}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Contribution:</span>
                <span className="font-semibold text-gray-900">
                  {(pensionRates.find((r) => r.type === 'Employee')?.percentage || 0) +
                    (pensionRates.find((r) => r.type === 'Employer')?.percentage || 0)}
                  %
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Change History Section */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-gray-900">Change History</h2>
          <p className="text-sm text-gray-600 mt-1">Recent modifications to tax and pension settings</p>
        </CardHeader>
        <CardBody>
          <Table<ChangeHistory>
            data={changeHistory}
            columns={historyColumns}
            emptyMessage="No changes recorded"
          />
        </CardBody>
      </Card>

      {/* Edit Tax Bracket Modal */}
      {showEditTaxModal && editingTaxBracket && (
        <Modal
          isOpen={showEditTaxModal}
          title="Edit Tax Bracket"
          onClose={() => {
            setShowEditTaxModal(false);
            setEditingTaxBracket(null);
          }}
          body={<div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Income
                </label>
                <Input
                  type="number"
                  value={editingTaxBracket.minIncome}
                  onChange={(e) =>
                    setEditingTaxBracket({
                      ...editingTaxBracket,
                      minIncome: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Income
                </label>
                <Input
                  type="number"
                  value={editingTaxBracket.maxIncome}
                  onChange={(e) =>
                    setEditingTaxBracket({
                      ...editingTaxBracket,
                      maxIncome: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingTaxBracket.rate}
                  onChange={(e) =>
                    setEditingTaxBracket({
                      ...editingTaxBracket,
                      rate: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deduction Amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingTaxBracket.deductionAmount}
                  onChange={(e) =>
                    setEditingTaxBracket({
                      ...editingTaxBracket,
                      deductionAmount: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective From
              </label>
              <Input
                type="date"
                value={editingTaxBracket.effectiveFrom}
                onChange={(e) =>
                  setEditingTaxBracket({
                    ...editingTaxBracket,
                    effectiveFrom: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditTaxModal(false);
                  setEditingTaxBracket(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveTaxBracket}>
                Save Changes
              </Button>
            </div>
          </div>}
        />
      )}

      {/* Edit Pension Rate Modal */}
      {showEditPensionModal && editingPensionRate && (
        <Modal
          isOpen={showEditPensionModal}
          title="Edit Pension Rate"
          onClose={() => {
            setShowEditPensionModal(false);
            setEditingPensionRate(null);
          }}
          body={<div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type: {editingPensionRate.type}
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Percentage (%)
              </label>
              <Input
                type="number"
                step="0.01"
                value={editingPensionRate.percentage}
                onChange={(e) =>
                  setEditingPensionRate({
                    ...editingPensionRate,
                    percentage: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                placeholder="Description..."
                value={editingPensionRate.description}
                onChange={(e) =>
                  setEditingPensionRate({
                    ...editingPensionRate,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective From
              </label>
              <Input
                type="date"
                value={editingPensionRate.effectiveFrom}
                onChange={(e) =>
                  setEditingPensionRate({
                    ...editingPensionRate,
                    effectiveFrom: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditPensionModal(false);
                  setEditingPensionRate(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSavePensionRate}>
                Save Changes
              </Button>
            </div>
          </div>}
        />
      )}
    </div>
  );
}
