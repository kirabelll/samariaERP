'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge, Input } from '@/components/ui';

interface Dispatch {
  id: string;
  dispatchNo: string;
  transporter: { companyName: string; name?: string } | null;
  truck: { plateNo: string } | null;
  loadedVolume: number;
  deliveredVolume: number | null;
  shortageVolume: number | null;
  shortageDeduction: number | null;
  status: string;
}

interface SummaryData {
  totalShortages: number;
  totalValue: number;
  pendingCount: number;
}

export default function ShortageVerificationPage() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalShortages: 0,
    totalValue: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    fetchDispatches();
  }, []);

  const fetchDispatches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/aggregate?status=Delivered');
      if (!response.ok) throw new Error('Failed to fetch dispatches');
      const data = await response.json();

      // Filter for shortages
      const allDispatches = data.data || data || [];
      const withShortages = allDispatches.filter((d: any) => (d.shortageVolume || 0) > 0);
      setDispatches(withShortages);

      // Calculate summary
      const totalShortages = withShortages.reduce((sum: number, d: any) => sum + (d.shortageVolume || 0), 0);
      const totalValue = withShortages.reduce((sum: number, d: any) => sum + (d.shortageDeduction || 0), 0);
      const pendingCount = withShortages.filter((d: any) => d.status !== 'Verified').length;

      setSummary({
        totalShortages,
        totalValue,
        pendingCount,
      });
    } catch (error) {
      console.error('Error fetching dispatches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (dispatchId: string) => {
    try {
      setVerifying(dispatchId);
      const response = await fetch(`/api/aggregate/${dispatchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Verified' }),
      });

      if (!response.ok) throw new Error('Verification failed');
      await fetchDispatches();
    } catch (error) {
      console.error('Error verifying dispatch:', error);
      alert('Failed to verify dispatch');
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F5F5F7' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-8" style={{ color: '#1D1D1F' }}>
          Shortage Verification
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <Card className="rounded-2xl bg-white">
            <CardBody className="p-6">
              <p className="text-sm font-medium mb-2" style={{ color: '#666' }}>
                Total Shortages (Units)
              </p>
              <p className="text-3xl font-bold" style={{ color: '#007AFF' }}>
                {(summary.totalShortages ?? 0).toFixed(2)}
              </p>
            </CardBody>
          </Card>

          <Card className="rounded-2xl bg-white">
            <CardBody className="p-6">
              <p className="text-sm font-medium mb-2" style={{ color: '#666' }}>
                Total Value
              </p>
              <p className="text-3xl font-bold" style={{ color: '#007AFF' }}>
                ETB {(summary.totalValue ?? 0).toLocaleString('en-US')}
              </p>
            </CardBody>
          </Card>

          <Card className="rounded-2xl bg-white">
            <CardBody className="p-6">
              <p className="text-sm font-medium mb-2" style={{ color: '#666' }}>
                Pending Verification
              </p>
              <p className="text-3xl font-bold" style={{ color: '#007AFF' }}>
                {summary.pendingCount}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ color: '#1D1D1F' }}>Loading...</div>
        ) : (
          <Card className="rounded-2xl bg-white">
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E5E7', backgroundColor: '#F5F5F7' }}>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Dispatch No
                      </th>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Transporter
                      </th>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Truck
                      </th>
                      <th className="px-6 py-4 text-right font-semibold" style={{ color: '#1D1D1F' }}>
                        Loaded Vol
                      </th>
                      <th className="px-6 py-4 text-right font-semibold" style={{ color: '#1D1D1F' }}>
                        Delivered Vol
                      </th>
                      <th className="px-6 py-4 text-right font-semibold" style={{ color: '#1D1D1F' }}>
                        Shortage
                      </th>
                      <th className="px-6 py-4 text-right font-semibold" style={{ color: '#1D1D1F' }}>
                        Shortage Value
                      </th>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Status
                      </th>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatches.map((dispatch) => (
                      <tr key={dispatch.id} style={{ borderBottom: '1px solid #E5E5E7' }}>
                        <td className="px-6 py-4 font-medium" style={{ color: '#1D1D1F' }}>
                          {dispatch.dispatchNo}
                        </td>
                        <td className="px-6 py-4" style={{ color: '#1D1D1F' }}>
                          {dispatch.transporter?.companyName || dispatch.transporter?.name || '-'}
                        </td>
                        <td className="px-6 py-4" style={{ color: '#1D1D1F' }}>
                          {dispatch.truck?.plateNo || '-'}
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: '#1D1D1F' }}>
                          {(dispatch.loadedVolume ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: '#1D1D1F' }}>
                          {(dispatch.deliveredVolume ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-medium" style={{ color: '#FF3B30' }}>
                          {(dispatch.shortageVolume ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: '#1D1D1F' }}>
                          ETB {(dispatch.shortageDeduction ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            status={dispatch.status === 'Verified' ? 'Completed' : 'InProgress'}
                            className="px-3 py-1 rounded-full text-xs font-semibold"
                          >
                            {dispatch.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {dispatch.status !== 'Verified' && (
                            <Button
                              onClick={() => handleVerify(dispatch.id)}
                              disabled={verifying === dispatch.id}
                              style={{
                                backgroundColor: verifying === dispatch.id ? '#ccc' : '#007AFF',
                                color: 'white',
                              }}
                              className="px-4 py-1 rounded-lg text-xs font-semibold"
                            >
                              {verifying === dispatch.id ? 'Verifying...' : 'Verify'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dispatches.length === 0 && !loading && (
                <div className="p-6 text-center" style={{ color: '#666' }}>
                  No shortages to verify
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
