'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge, Input, Select, Table } from '@/components/ui';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';

interface Recovery {
  id: string;
  recoveryNo: string;
  transporter: {
    id: string;
    code: string;
    companyName: string;
  };
  sourceModule: 'AGGREGATE' | 'CEMENT';
  sourceRef: string;
  originalAmount: number;
  recoveredAmount: number;
  pendingAmount: number;
  status: 'Open' | 'Partial' | 'Recovered' | 'Written_Off';
  date: string;
}

interface SummaryCard {
  label: string;
  amount: number;
  color: string;
}

interface Transporter {
  id: string;
  code: string;
  companyName: string;
}

export default function TransporterRecoveriesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [transporterFilter, setTransporterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // New recovery form state
  const [showNewRecoveryForm, setShowNewRecoveryForm] = useState(false);
  const [newRecoveryForm, setNewRecoveryForm] = useState({
    transporterId: '',
    sourceModule: 'AGGREGATE',
    sourceRef: '',
    originalAmount: '',
  });
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loadingTransporters, setLoadingTransporters] = useState(false);

  // Record recovery state
  const [selectedRecoveryId, setSelectedRecoveryId] = useState<string | null>(null);
  const [recoveryAmountInput, setRecoveryAmountInput] = useState('');
  const [recordingRecovery, setRecordingRecovery] = useState(false);

  // Fetch main data
  const { data, pagination, loading, error, refetch } = useApiList<Recovery>(
    '/api/transporters/recoveries',
    {
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      filters: {
        transporter: transporterFilter,
        status: statusFilter,
        source: sourceFilter,
      },
    }
  );

  // Fetch transporters on mount
  useEffect(() => {
    const fetchTransporters = async () => {
      setLoadingTransporters(true);
      try {
        const res = await fetch('/api/transporters?limit=1000');
        const result = await res.json();
        if (result.success && result.data) {
          setTransporters(result.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch transporters:', err);
      } finally {
        setLoadingTransporters(false);
      }
    };

    fetchTransporters();
  }, []);

  // Calculate summary
  const summary: SummaryCard[] = [
    {
      label: 'Total Open',
      amount: data
        .filter((r) => r.status === 'Open')
        .reduce((sum, r) => sum + r.pendingAmount, 0),
      color: '#FF9500',
    },
    {
      label: 'Partially Recovered',
      amount: data
        .filter((r) => r.status === 'Partial')
        .reduce((sum, r) => sum + r.recoveredAmount, 0),
      color: '#007AFF',
    },
    {
      label: 'Fully Recovered',
      amount: data
        .filter((r) => r.status === 'Recovered')
        .reduce((sum, r) => sum + r.recoveredAmount, 0),
      color: '#34C759',
    },
    {
      label: 'Written Off',
      amount: data
        .filter((r) => r.status === 'Written_Off')
        .reduce((sum, r) => sum + r.originalAmount, 0),
      color: '#FF3B30',
    },
  ];

  const handleCreateRecovery = async () => {
    if (!newRecoveryForm.transporterId || !newRecoveryForm.sourceRef || !newRecoveryForm.originalAmount) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const res = await fetch('/api/transporters/recoveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transporterId: newRecoveryForm.transporterId,
          sourceModule: newRecoveryForm.sourceModule,
          sourceRef: newRecoveryForm.sourceRef,
          originalAmount: parseFloat(newRecoveryForm.originalAmount),
        }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create recovery');
      }

      showToast('Recovery created successfully', 'success');

      setShowNewRecoveryForm(false);
      setNewRecoveryForm({
        transporterId: '',
        sourceModule: 'AGGREGATE',
        sourceRef: '',
        originalAmount: '',
      });
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to create recovery', 'error');
    }
  };

  const handleRecordRecovery = async () => {
    if (!selectedRecoveryId || !recoveryAmountInput) {
      showToast('Please enter a recovery amount', 'error');
      return;
    }

    const amount = parseFloat(recoveryAmountInput);
    if (amount <= 0) {
      showToast('Recovery amount must be greater than 0', 'error');
      return;
    }

    setRecordingRecovery(true);

    try {
      const res = await fetch(`/api/transporters/recoveries/${selectedRecoveryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoveredAmount: amount,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to record recovery');
      }

      showToast('Recovery recorded successfully', 'success');

      setSelectedRecoveryId(null);
      setRecoveryAmountInput('');
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to record recovery', 'error');
    } finally {
      setRecordingRecovery(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'Pending';
      case 'Partial':
        return 'InProgress';
      case 'Recovered':
        return 'Completed';
      case 'Written_Off':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };

  const columns: ColumnDef<Recovery>[] = [
    { header: 'Recovery No', accessor: 'recoveryNo', sortable: true },
    {
      header: 'Transporter',
      accessor: 'transporter',
      render: (transporter) => `${(transporter as any).code} - ${(transporter as any).companyName}`,
    },
    {
      header: 'Source',
      accessor: 'sourceModule',
      render: (source) => (
        <Badge status={source === 'AGGREGATE' ? 'Approved' : 'Pending'}>
          {source}
        </Badge>
      ),
    },
    { header: 'Source Ref', accessor: 'sourceRef' },
    {
      header: 'Original Amount',
      accessor: 'originalAmount',
      render: (amount) => `₨${((amount as number) ?? 0).toLocaleString('en-PK')}`,
    },
    {
      header: 'Recovered Amount',
      accessor: 'recoveredAmount',
      render: (amount) => `₨${((amount as number) ?? 0).toLocaleString('en-PK')}`,
    },
    {
      header: 'Pending Amount',
      accessor: 'pendingAmount',
      render: (amount) => `₨${((amount as number) ?? 0).toLocaleString('en-PK')}`,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => <Badge status={getStatusBadgeColor(status as string)}>{status}</Badge>,
    },
    {
      header: 'Date',
      accessor: 'date',
      render: (date) => new Date(date as string).toLocaleDateString('en-PK'),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id, row) => (
        <div className="flex gap-2">
          {(row as any).status !== 'Recovered' && (row as any).status !== 'Written_Off' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectedRecoveryId(String(id))}
            >
              Record Recovery
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: '#1D1D1F' }}>
          Transporter Recovery Ledger
        </h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((card, index) => (
          <Card key={index}>
            <CardBody>
              <div className="flex flex-col">
                <p className="text-sm font-medium" style={{ color: '#86868B' }}>
                  {card.label}
                </p>
                <p className="text-2xl font-bold mt-2" style={{ color: card.color }}>
                  ₨{(card.amount ?? 0).toLocaleString('en-PK')}
                </p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* New Recovery Form */}
      {showNewRecoveryForm && (
        <Card className="bg-[#F5F5F7] rounded-2xl">
          <CardHeader className="border-b border-[#D2D2D7]">
            <h2 className="text-lg font-semibold" style={{ color: '#1D1D1F' }}>
              Add New Recovery
            </h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Transporter"
                options={[
                  { value: '', label: 'Select Transporter' },
                  ...transporters.map((t) => ({
                    value: t.id,
                    label: `${t.code} - ${t.companyName}`,
                  })),
                ]}
                value={newRecoveryForm.transporterId}
                onChange={(e) =>
                  setNewRecoveryForm({
                    ...newRecoveryForm,
                    transporterId: e.target.value,
                  })
                }
                disabled={loadingTransporters}
                required
              />
              <Select
                label="Source Module"
                options={[
                  { value: 'AGGREGATE', label: 'Aggregate' },
                  { value: 'CEMENT', label: 'Cement' },
                ]}
                value={newRecoveryForm.sourceModule}
                onChange={(e) =>
                  setNewRecoveryForm({
                    ...newRecoveryForm,
                    sourceModule: (e.target as HTMLSelectElement).value as string,
                  })
                }
                required
              />
              <Input
                label="Source Reference"
                placeholder="e.g., AGG-001"
                value={newRecoveryForm.sourceRef}
                onChange={(e) =>
                  setNewRecoveryForm({
                    ...newRecoveryForm,
                    sourceRef: (e.target as HTMLInputElement).value,
                  })
                }
                required
              />
              <Input
                label="Original Amount"
                type="number"
                placeholder="0.00"
                value={newRecoveryForm.originalAmount}
                onChange={(e) =>
                  setNewRecoveryForm({
                    ...newRecoveryForm,
                    originalAmount: (e.target as HTMLInputElement).value,
                  })
                }
                required
              />
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="primary" onClick={handleCreateRecovery}>
                Create Recovery
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewRecoveryForm(false);
                  setNewRecoveryForm({
                    transporterId: '',
                    sourceModule: 'AGGREGATE',
                    sourceRef: '',
                    originalAmount: '',
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search recovery no..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Select
              options={[
                { value: '', label: 'All Transporters' },
                ...transporters.map((t) => ({
                  value: t.id,
                  label: `${t.code} - ${t.companyName}`,
                })),
              ]}
              value={transporterFilter}
              onChange={(e) => {
                setTransporterFilter((e.target as HTMLSelectElement).value);
                setCurrentPage(1);
              }}
            />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Open', label: 'Open' },
                { value: 'Partial', label: 'Partial' },
                { value: 'Recovered', label: 'Recovered' },
                { value: 'Written_Off', label: 'Written Off' },
              ]}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter((e.target as HTMLSelectElement).value);
                setCurrentPage(1);
              }}
            />
            <Select
              options={[
                { value: '', label: 'All Sources' },
                { value: 'AGGREGATE', label: 'Aggregate' },
                { value: 'CEMENT', label: 'Cement' },
              ]}
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter((e.target as HTMLSelectElement).value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm" style={{ color: '#86868B' }}>
              {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} recoveries`}
            </div>
            {!showNewRecoveryForm && (
              <Button variant="primary" onClick={() => setShowNewRecoveryForm(true)}>
                + New Recovery
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody>
          {error && (
            <div className="text-[#FF3B30] mb-4">
              Error: {error}
            </div>
          )}
          <Table<Recovery>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading recoveries...' : 'No recoveries found'}
          />
        </CardBody>
      </Card>

      {/* Record Recovery Dialog */}
      <Modal
        isOpen={!!selectedRecoveryId}
        onClose={() => {
          setSelectedRecoveryId(null);
          setRecoveryAmountInput('');
        }}
        title="Record Recovery"
        body={
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Enter the amount recovered:</p>
            <Input
              type="number"
              placeholder="0.00"
              value={recoveryAmountInput}
              onChange={(e) => setRecoveryAmountInput(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <Button onClick={handleRecordRecovery} className="flex-1">Confirm</Button>
              <Button variant="outline" onClick={() => { setSelectedRecoveryId(null); setRecoveryAmountInput(''); }} className="flex-1">Cancel</Button>
            </div>
          </div>
        }
      />
    </div>
  );
}
