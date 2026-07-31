'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Input } from '@/components/ui';

interface TransporterSummary {
  transporterId: string;
  transporterCode: string;
  transporterName: string;
  totalDispatches: number;
  totalLoadedVolume: number;
  totalDeliveredVolume: number;
  totalShortage: number;
  totalGrossFee: number;
  totalShortageDeduction: number;
  totalNetPayment: number;
}

interface ReconciliationData {
  date: string;
  summary: TransporterSummary[];
  grandTotals: {
    totalDispatches: number;
    totalLoadedVolume: number;
    totalDeliveredVolume: number;
    totalShortage: number;
    totalGrossFee: number;
    totalShortageDeduction: number;
    totalNetPayment: number;
  };
  totalRecords: number;
}

export default function DailyReconciliationPage() {
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReconciliation();
  }, [date]);

  const fetchReconciliation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/aggregate/reconciliation?date=${date}`);
      if (!response.ok) throw new Error('Failed to fetch reconciliation');
      const result = await response.json();
      setData(result.data || null);
    } catch (error) {
      console.error('Error fetching reconciliation:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const totals = data?.grandTotals;
  const transporters = data?.summary || [];

  return (
    <div className="min-h-screen p-8 bg-[#F5F5F7]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-[#1D1D1F]">
          Daily Reconciliation
        </h1>

        {/* Date Picker */}
        <div className="mb-8 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2 text-[#1D1D1F]">
              Select Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-2xl bg-white border-[#E5E5E7]"
            />
          </div>
        </div>

        {/* Summary Cards */}
        {totals && (
          <div className="grid grid-cols-4 gap-6 mb-8">
            <Card className="rounded-2xl bg-white">
              <CardBody className="p-6">
                <p className="text-sm font-medium mb-2 text-[#666]">
                  Total Dispatches
                </p>
                <p className="text-3xl font-bold text-[#007AFF]">
                  {totals.totalDispatches || 0}
                </p>
              </CardBody>
            </Card>

            <Card className="rounded-2xl bg-white">
              <CardBody className="p-6">
                <p className="text-sm font-medium mb-2 text-[#666]">
                  Total Volume
                </p>
                <p className="text-3xl font-bold text-[#007AFF]">
                  {(totals.totalDeliveredVolume || 0).toFixed(2)}
                </p>
              </CardBody>
            </Card>

            <Card className="rounded-2xl bg-white">
              <CardBody className="p-6">
                <p className="text-sm font-medium mb-2 text-[#666]">
                  Total Gross Fee
                </p>
                <p className="text-3xl font-bold text-[#007AFF]">
                  ETB {(totals.totalGrossFee || 0).toLocaleString('en-US')}
                </p>
              </CardBody>
            </Card>

            <Card className="rounded-2xl bg-white">
              <CardBody className="p-6">
                <p className="text-sm font-medium mb-2 text-[#666]">
                  Total Net Payment
                </p>
                <p className="text-3xl font-bold text-[#34C759]">
                  ETB {(totals.totalNetPayment || 0).toLocaleString('en-US')}
                </p>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Transporter Table */}
        {loading ? (
          <div className="text-[#1D1D1F]">Loading...</div>
        ) : transporters.length > 0 ? (
          <Card className="rounded-2xl bg-white">
            <CardHeader className="p-6 border-b border-[#E5E5E7]">
              <h3 className="text-lg font-bold text-[#1D1D1F]">
                By Transporter
              </h3>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E5E5E7', backgroundColor: '#F5F5F7' }}>
                      <th className="px-6 py-4 text-left font-semibold" style={{ color: '#1D1D1F' }}>
                        Transporter
                      </th>
                      <th className="px-6 py-4 text-right font-semibold" style={{ color: '#1D1D1F' }}>
                        Dispatches
                      </th>
                      <th className="px-6 py-4 text-right font-semibold" style={{ color: '#1D1D1F' }}>
                        Loaded
                      </th>
                      <th className="px-6 py-4 text-right font-semibold" style={{ color: '#1D1D1F' }}>
                        Delivered
                      </th>
                      <th className="px-6 py-4 text-right font-semibold" style={{ color: '#1D1D1F' }}>
                        Shortage
                      </th>
                      <th className="px-6 py-4 text-right font-semibold" style={{ color: '#1D1D1F' }}>
                        Gross Fee
                      </th>
                      <th className="px-6 py-4 text-right font-semibold" style={{ color: '#1D1D1F' }}>
                        Deduction
                      </th>
                      <th className="px-6 py-4 text-right font-semibold" style={{ color: '#1D1D1F' }}>
                        Net Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transporters.map((t) => (
                      <tr key={t.transporterId} style={{ borderBottom: '1px solid #E5E5E7' }}>
                        <td className="px-6 py-4 font-medium" style={{ color: '#1D1D1F' }}>
                          {t.transporterName}
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: '#1D1D1F' }}>
                          {t.totalDispatches}
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: '#1D1D1F' }}>
                          {(t.totalLoadedVolume || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: '#1D1D1F' }}>
                          {(t.totalDeliveredVolume || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: '#FF3B30' }}>
                          {(t.totalShortage || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: '#1D1D1F' }}>
                          ETB {(t.totalGrossFee || 0).toLocaleString('en-US')}
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: '#FF3B30' }}>
                          ETB {(t.totalShortageDeduction || 0).toLocaleString('en-US')}
                        </td>
                        <td className="px-6 py-4 text-right font-bold" style={{ color: '#007AFF' }}>
                          ETB {(t.totalNetPayment || 0).toLocaleString('en-US')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {totals && (
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #E5E5E7', backgroundColor: '#F5F5F7' }}>
                        <td className="px-6 py-4 font-bold" style={{ color: '#1D1D1F' }}>
                          GRAND TOTAL
                        </td>
                        <td className="px-6 py-4 text-right font-bold" style={{ color: '#1D1D1F' }}>
                          {totals.totalDispatches || 0}
                        </td>
                        <td className="px-6 py-4 text-right font-bold" style={{ color: '#1D1D1F' }}>
                          {(totals.totalLoadedVolume || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold" style={{ color: '#1D1D1F' }}>
                          {(totals.totalDeliveredVolume || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold" style={{ color: '#FF3B30' }}>
                          {(totals.totalShortage || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold" style={{ color: '#1D1D1F' }}>
                          ETB {(totals.totalGrossFee || 0).toLocaleString('en-US')}
                        </td>
                        <td className="px-6 py-4 text-right font-bold" style={{ color: '#FF3B30' }}>
                          ETB {(totals.totalShortageDeduction || 0).toLocaleString('en-US')}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-lg" style={{ color: '#34C759' }}>
                          ETB {(totals.totalNetPayment || 0).toLocaleString('en-US')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card className="rounded-2xl bg-white">
            <CardBody className="p-6 text-center text-[#666]">
              No reconciliation data for this date
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
