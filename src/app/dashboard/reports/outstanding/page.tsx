'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui';
import { StatCard } from '@/components/ui/Card';

interface OutstandingRecord {
  customerId?: string;
  supplierId?: string;
  transporterId?: string;
  customerName?: string;
  supplierName?: string;
  transporterName?: string;
  given: number;
  paid: number;
  outstanding: number;
}

interface Totals {
  given: number;
  paid: number;
  outstanding: number;
}

type ReportType = 'customers' | 'suppliers' | 'transporters';

export default function OutstandingReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>('customers');
  const [records, setRecords] = useState<OutstandingRecord[]>([]);
  const [totals, setTotals] = useState<Totals>({ given: 0, paid: 0, outstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch data when tab or dates change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams({ type: activeTab });
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      try {
        const res = await fetch(`/api/reports/outstanding?${params}`);
        const json = await res.json();
        if (json.success) {
          setRecords(json.data.records || []);
          setTotals(json.data.totals || { given: 0, paid: 0, outstanding: 0 });
        }
      } catch (err) {
        console.error('Error fetching outstanding report:', err);
      }
      setLoading(false);
    };

    fetchData();
  }, [activeTab, fromDate, toDate]);

  const getName = (record: OutstandingRecord): string => {
    if (activeTab === 'customers') return record.customerName || 'Unknown';
    if (activeTab === 'suppliers') return record.supplierName || 'Unknown';
    return record.transporterName || 'Unknown';
  };

  const getRowKey = (record: OutstandingRecord): string => {
    if (activeTab === 'customers') return record.customerId || '';
    if (activeTab === 'suppliers') return record.supplierId || '';
    return record.transporterId || '';
  };

  const toggleExpandRow = (key: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Filter records by search term
  const filteredRecords = records.filter((record) =>
    getName(record).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculatePercentPaid = (given: number, paid: number): number => {
    return given > 0 ? Math.round((paid / given) * 100) : 0;
  };

  const getTabLabel = (): string => {
    switch (activeTab) {
      case 'customers':
        return 'Customers';
      case 'suppliers':
        return 'Suppliers';
      case 'transporters':
        return 'Transporters';
      default:
        return activeTab;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Outstanding Reports</h1>
        <p className="text-gray-600 mt-1">Track given, paid, and outstanding amounts</p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Filter by Date Range</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['customers', 'suppliers', 'transporters'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSearchTerm('');
              setExpandedRows(new Set());
            }}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Given"
            value={`${(totals.given ?? 0).toLocaleString('en-US')} ETB`}
            icon={<span>📤</span>}
            backgroundColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Total Paid"
            value={`${(totals.paid ?? 0).toLocaleString('en-US')} ETB`}
            icon={<span>✓</span>}
            backgroundColor="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            label="Total Outstanding"
            value={`${(totals.outstanding ?? 0).toLocaleString('en-US')} ETB`}
            icon={<span>⏳</span>}
            backgroundColor={totals.outstanding > 0 ? 'bg-orange-50' : 'bg-gray-50'}
            iconColor={totals.outstanding > 0 ? 'text-orange-600' : 'text-gray-600'}
          />
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder={`Search ${getTabLabel().toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <Card>
        <CardBody>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading report...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No outstanding data found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 text-sm">Name</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700 text-sm">Given (ETB)</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700 text-sm">Paid (ETB)</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700 text-sm">Outstanding (ETB)</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700 text-sm">% Paid</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700 text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => {
                    const rowKey = getRowKey(record);
                    const isExpanded = expandedRows.has(rowKey);
                    const percentPaid = calculatePercentPaid(record.given, record.paid);

                    return (
                      <React.Fragment key={rowKey}>
                        <tr
                          className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => toggleExpandRow(rowKey)}
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">{getName(record)}</td>
                          <td className="text-right px-4 py-3 text-gray-900">
                            {(record.given ?? 0).toLocaleString('en-US')}
                          </td>
                          <td className="text-right px-4 py-3 text-gray-900">
                            {(record.paid ?? 0).toLocaleString('en-US')}
                          </td>
                          <td
                            className={`text-right px-4 py-3 font-semibold ${
                              (record.outstanding ?? 0) > 0 ? 'text-orange-600' : 'text-green-600'
                            }`}
                          >
                            {(record.outstanding ?? 0).toLocaleString('en-US')}
                          </td>
                          <td className="text-right px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${percentPaid}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-700 min-w-10">{percentPaid}%</span>
                            </div>
                          </td>
                          <td className="text-center px-4 py-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandRow(rowKey);
                              }}
                              className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <td colSpan={6} className="px-4 py-4">
                              <div className="space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-gray-600">Total Given</p>
                                    <p className="font-semibold text-gray-900">
                                      {(record.given ?? 0).toLocaleString('en-US')} ETB
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Total Paid</p>
                                    <p className="font-semibold text-gray-900">
                                      {(record.paid ?? 0).toLocaleString('en-US')} ETB
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Outstanding</p>
                                    <p
                                      className={`font-semibold ${
                                        (record.outstanding ?? 0) > 0 ? 'text-orange-600' : 'text-green-600'
                                      }`}
                                    >
                                      {(record.outstanding ?? 0).toLocaleString('en-US')} ETB
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">Payment Status</p>
                                    <p className="font-semibold text-gray-900">
                                      {percentPaid === 100 ? 'Fully Paid' : percentPaid > 0 ? 'Partial' : 'Unpaid'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          onClick={async () => {
            try {
              const params = new URLSearchParams({ type: activeTab });
              if (fromDate) params.set('from', fromDate);
              if (toDate) params.set('to', toDate);
              const res = await fetch(`/api/reports/outstanding/export?${params}`);
              if (!res.ok) throw new Error('Failed to export');
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `outstanding-${activeTab}-report.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            } catch (err) {
              console.error('Error exporting report:', err);
              alert('Failed to export report');
            }
          }}
        >
          Export Report
        </button>
      </div>
    </div>
  );
}
