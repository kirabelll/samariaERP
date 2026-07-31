'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button, Badge, Input } from '@/components/ui';

interface Exception {
  id: number;
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  module: string;
  recordRef: string;
  description: string;
  assignedTo: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  created: string;
}

const exceptionTypeColors: Record<string, string> = {
  MISSING_DOCUMENT: 'bg-red-100 text-red-800',
  OVERDUE_APPROVAL: 'bg-orange-100 text-orange-800',
  SHORTAGE_MISMATCH: 'bg-yellow-100 text-yellow-800',
  EXPIRED_LICENSE: 'bg-red-100 text-red-800',
  OVER_CREDIT: 'bg-orange-100 text-orange-800',
  UNRECOVERED_DEDUCTION: 'bg-yellow-100 text-yellow-800',
  UNFILED_VAT: 'bg-red-100 text-red-800',
  PRICE_OVERRIDE: 'bg-blue-100 text-blue-800',
  PENDING_DEPOSIT: 'bg-yellow-100 text-yellow-800',
};

const severityColors: Record<string, { dot: string; bg: string }> = {
  Critical: { dot: '#FF3B30', bg: '#FF3B3020' },
  High: { dot: '#FF9500', bg: '#FF950020' },
  Medium: { dot: '#FFCC00', bg: '#FFCC0020' },
  Low: { dot: '#8E8E93', bg: '#8E8E9320' },
};

const statusColors: Record<string, string> = {
  Open: 'bg-red-100 text-red-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  Resolved: 'bg-green-100 text-green-800',
};

export default function ExceptionCenterPage() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchExceptions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (moduleFilter) params.set('module', moduleFilter);
      if (severityFilter) params.set('severity', severityFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/exceptions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setExceptions(result.data || []);
    } catch (err) {
      console.error('Error fetching exceptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [moduleFilter, severityFilter, statusFilter, typeFilter]);

  const countBySeverity = {
    Critical: exceptions.filter((e) => e.severity === 'Critical').length,
    High: exceptions.filter((e) => e.severity === 'High').length,
    Medium: exceptions.filter((e) => e.severity === 'Medium').length,
    Low: exceptions.filter((e) => e.severity === 'Low').length,
  };

  const handleResolve = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/exceptions/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Resolved', resolutionNotes }),
      });
      if (!res.ok) throw new Error('Failed to resolve');
      setShowResolveModal(false);
      setResolutionNotes('');
      setSelectedId(null);
      fetchExceptions();
    } catch (err) {
      console.error('Error resolving exception:', err);
      alert('Failed to resolve exception');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6" style={{ background: '#F5F5F7' }}>
      <h1 className="text-3xl font-bold" style={{ color: '#1D1D1F' }}>
        Exception Center
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Critical', count: countBySeverity.Critical, color: '#FF3B30' },
          { label: 'High', count: countBySeverity.High, color: '#FF9500' },
          { label: 'Medium', count: countBySeverity.Medium, color: '#FFCC00' },
          { label: 'Low', count: countBySeverity.Low, color: '#8E8E93' },
        ].map((item) => (
          <Card key={item.label} className="rounded-2xl overflow-hidden">
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: item.color }}
                />
                <div className="flex-1">
                  <div className="text-sm" style={{ color: '#666' }}>
                    {item.label}
                  </div>
                  <div className="text-2xl font-bold" style={{ color: item.color }}>
                    {item.count}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="bg-[#F5F5F7] border-b border-[#E5E5EA]">
          <h2 className="text-lg font-bold" style={{ color: '#1D1D1F' }}>Filters</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                Module
              </label>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl border"
                style={{ borderColor: '#007AFF' }}
              >
                <option value="">All Modules</option>
                <option value="medical">Medical</option>
                <option value="construction">Construction</option>
                <option value="accounting">Accounting</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                Severity
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl border"
                style={{ borderColor: '#007AFF' }}
              >
                <option value="">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl border"
                style={{ borderColor: '#007AFF' }}
              >
                <option value="">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl border"
                style={{ borderColor: '#007AFF' }}
              >
                <option value="">All Types</option>
                <option value="MISSING_DOCUMENT">Missing Document</option>
                <option value="OVERDUE_APPROVAL">Overdue Approval</option>
                <option value="SHORTAGE_MISMATCH">Shortage Mismatch</option>
                <option value="EXPIRED_LICENSE">Expired License</option>
                <option value="OVER_CREDIT">Over Credit</option>
                <option value="UNRECOVERED_DEDUCTION">Unrecovered Deduction</option>
                <option value="UNFILED_VAT">Unfiled VAT</option>
                <option value="PRICE_OVERRIDE">Price Override</option>
                <option value="PENDING_DEPOSIT">Pending Deposit</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="rounded-2xl overflow-hidden">
        <CardBody>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : exceptions.length === 0 ? (
            <div className="text-center py-8">No exceptions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#F5F5F7', borderBottom: '1px solid #E5E5EA' }}>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Type
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Module
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Record Ref
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Assigned To
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Created
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold" style={{ color: '#1D1D1F' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((exc) => (
                    <tr
                      key={exc.id}
                      className="border-b border-[#E5E5EA] hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm">
                        <span className={exceptionTypeColors[exc.type] || 'bg-gray-100 text-gray-800'}>
                          {exc.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div
                          className="w-3 h-3 rounded-full mx-auto"
                          style={{ background: severityColors[exc.severity]?.dot }}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1D1D1F]">
                        <Badge status={exc.status === 'Resolved' ? 'Completed' : 'InProgress'}>{exc.module}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#007AFF' }}>
                        <strong>{exc.recordRef}</strong>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#1D1D1F' }}>
                        {exc.description}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#1D1D1F' }}>
                        {exc.assignedTo}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={statusColors[exc.status] || 'bg-gray-100 text-gray-800'}>
                          {exc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#1D1D1F' }}>
                        {new Date(exc.created).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {exc.status !== 'Resolved' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedId(exc.id);
                              setShowResolveModal(true);
                            }}
                            style={{ background: '#34C759', color: 'white' }}
                            className="rounded-2xl"
                          >
                            Resolve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="rounded-2xl w-96">
            <CardHeader className="bg-[#F5F5F7] border-b border-[#E5E5EA]">
              <h2 className="text-lg font-bold" style={{ color: '#1D1D1F' }}>Resolve Exception</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                  Resolution Notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Enter resolution details..."
                  className="w-full px-4 py-2 rounded-2xl border"
                  style={{ borderColor: '#007AFF' }}
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResolveModal(false);
                    setResolutionNotes('');
                    setSelectedId(null);
                  }}
                  className="flex-1 rounded-2xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResolve}
                  disabled={actionLoading || !resolutionNotes}
                  style={{ background: '#34C759', color: 'white' }}
                  className="flex-1 rounded-2xl"
                >
                  {actionLoading ? 'Processing...' : 'Resolve'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
