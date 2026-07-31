'use client';
import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Button, Badge, Input } from '@/components/ui';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const reports: ReportCard[] = [
  {
    id: 'sales-by-customer',
    title: 'Sales by Customer',
    description: 'Customer-wise invoice totals and volumes',
    icon: '👥',
  },
  {
    id: 'batch-expiry',
    title: 'Batch/Expiry Report',
    description: 'Items nearing expiry (30/60/90 days)',
    icon: '📦',
  },
  {
    id: 'store-issue',
    title: 'Store Issue Report',
    description: 'Issues by period with details',
    icon: '📋',
  },
  {
    id: 'margin-analysis',
    title: 'Margin Analysis',
    description: 'Cost vs selling price margins',
    icon: '📊',
  },
  {
    id: 'commission',
    title: 'Commission Report',
    description: 'Commission breakdown by salesperson',
    icon: '💰',
  },
  {
    id: 'license-expiry',
    title: 'License Expiry Report',
    description: 'Customers with expiring licenses',
    icon: '⚠️',
  },
];

interface ReportData {
  columns: string[];
  rows: any[];
}

export default function MedicalReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleViewReport = async (reportId: string) => {
    setSelectedReport(reportId);
    setReportData(null);
    await fetchReportData(reportId);
  };

  const fetchReportData = async (reportId: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ reportId });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/reports/medical?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setReportData(result.data);
    } catch (err) {
      console.error('Error fetching report:', err);
      alert('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedReport) return;
    try {
      const params = new URLSearchParams({ reportId: selectedReport, format: 'excel' });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/reports/medical/export?${params}`);
      if (!res.ok) throw new Error('Failed to export');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}-report.csv`;
      a.click();
    } catch (err) {
      console.error('Error exporting report:', err);
      alert('Failed to export report');
    }
  };

  if (selectedReport && reportData) {
    const report = reports.find((r) => r.id === selectedReport);
    return (
      <div className="space-y-6 p-6" style={{ background: '#F5F5F7' }}>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedReport(null);
              setReportData(null);
            }}
            className="rounded-2xl"
          >
            Back
          </Button>
          <h1 className="text-3xl font-bold" style={{ color: '#1D1D1F' }}>
            {report?.title}
          </h1>
        </div>

        <Card className="rounded-2xl overflow-hidden">
          <CardBody>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2 rounded-2xl border"
                  style={{ borderColor: '#007AFF' }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1D1D1F' }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2 rounded-2xl border"
                  style={{ borderColor: '#007AFF' }}
                />
              </div>
            </div>

            <Button
              onClick={() => fetchReportData(selectedReport)}
              disabled={loading}
              style={{ background: '#007AFF', color: 'white' }}
              className="rounded-2xl mb-6"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardBody>
        </Card>

        <Card className="rounded-2xl overflow-hidden">
          <CardBody>
            <div className="flex justify-end mb-4">
              <Button
                onClick={handleExport}
                style={{ background: '#34C759', color: 'white' }}
                className="rounded-2xl"
              >
                Export to Excel
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#F5F5F7', borderBottom: '1px solid #E5E5EA' }}>
                    {reportData.columns.map((col, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-3 text-left font-semibold"
                        style={{ color: '#1D1D1F' }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.rows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="border-b border-gray-200"
                      style={{ borderColor: '#E5E5EA' }}
                    >
                      {reportData.columns.map((col, colIdx) => (
                        <td
                          key={colIdx}
                          className="px-4 py-3"
                          style={{ color: '#1D1D1F' }}
                        >
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" style={{ background: '#F5F5F7' }}>
      <h1 className="text-3xl font-bold" style={{ color: '#1D1D1F' }}>
        Medical Reports
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div
            key={report.id}
            onClick={() => handleViewReport(report.id)}
            className="rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
          >
            <Card className="rounded-2xl overflow-hidden">
              <CardBody className="p-6">
                <div className="text-4xl mb-4">{report.icon}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#1D1D1F' }}>
                  {report.title}
                </h3>
                <p style={{ color: '#666' }} className="text-sm mb-4">
                  {report.description}
                </p>
                <Button
                  style={{ background: '#007AFF', color: 'white' }}
                  className="rounded-2xl w-full"
                  onClick={() => handleViewReport(report.id)}
                >
                  View Report
                </Button>
              </CardBody>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
