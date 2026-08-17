'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { Card, CardHeader, CardBody, StatCard, Table, Badge, Button, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import Link from 'next/link';

interface CustomerReceivables {
  customerId: string;
  customerName: string;
  itemId: string;
  itemName: string;
  totalDeliveredVolume: number;
  aggregateValue: number;
  totalReceivable: number;
}

interface SupplierPayables {
  supplierId: string;
  supplierName: string;
  itemId: string;
  itemName: string;
  totalVolume: number;
  aggregateValue: number;
  totalPayable: number;
}

interface TransporterPayments {
  transporterId: string;
  transporterName: string;
  totalNetPayment: number;
  truckCount: number;
}

interface DailyReportRow {
  date: string;
  totalDeliveries: number;
  totalSalesValue: number;
  totalTransportCosts: number;
  totalShortageDeductions: number;
}

interface SummaryData {
  customerReceivables: CustomerReceivables[];
  totalCustomerReceivables: number;
  supplierPayables: SupplierPayables[];
  totalSupplierPayables: number;
  transporterPayments: TransporterPayments[];
  totalTransportPayable: number;
  dailyReports: DailyReportRow[];
  metrics: {
    totalDeliveries: number;
    totalSalesValue: number;
    totalTransportCosts: number;
    totalShortageDeductions: number;
    netProfit: number;
  };
}

const CurrencyIcon = () => <span className="text-2xl">💰</span>;
const TrendingUpIcon = () => <span className="text-2xl">📈</span>;
const PaymentIcon = () => <span className="text-2xl">💳</span>;
const ProfitIcon = () => <span className="text-2xl">📊</span>;

export default function AggregateSummaryPage() {
  const { t } = useI18n();
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables' | 'transport' | 'daily'>('receivables');

  const fetchSummary = async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const res = await fetch(`/api/aggregate/summary?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSummaryData(json.data);
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleDateFilter = () => {
    fetchSummary(startDate, endDate);
  };

  const handleResetDates = () => {
    setStartDate('');
    setEndDate('');
    fetchSummary('', '');
  };

  // Customer Receivables Columns
  const receivablesColumns: ColumnDef<CustomerReceivables>[] = [
    {
      header: 'Customer Name',
      accessor: 'customerName',
      sortable: true,
    },
    {
      header: 'Item',
      accessor: 'itemName',
      sortable: true,
    },
    {
      header: 'Delivered Volume (m³)',
      accessor: 'totalDeliveredVolume',
      sortable: true,
      render: (val) => Number(val).toFixed(2),
    },
    {
      header: 'Aggregate Value (ETB/m³)',
      accessor: 'aggregateValue',
      sortable: true,
      render: (val, row) => {
        const rate = row.totalDeliveredVolume > 0 ? row.totalReceivable / row.totalDeliveredVolume : Number(val || 0);
        return rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },
    },
    {
      header: 'Total Receivable (ETB)',
      accessor: 'totalReceivable',
      sortable: true,
      render: (val) => Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    },
  ];

  // Supplier Payables Columns
  const payablesColumns: ColumnDef<SupplierPayables>[] = [
    {
      header: 'Supplier Name',
      accessor: 'supplierName',
      sortable: true,
    },
    {
      header: 'Item',
      accessor: 'itemName',
      sortable: true,
    },
    {
      header: 'Volume (m³)',
      accessor: 'totalVolume',
      sortable: true,
      render: (val) => Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    },
    {
      header: 'Aggregate Value (ETB/m³)',
      accessor: 'aggregateValue',
      sortable: true,
      render: (val, row) => {
        const rate = row.totalVolume > 0 ? row.totalPayable / row.totalVolume : Number(val || 0);
        return rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },
    },
    {
      header: 'Total Payable (ETB)',
      accessor: 'totalPayable',
      sortable: true,
      render: (val) => Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    },
  ];

  // Transporter Payments Columns
  const transporterColumns: ColumnDef<TransporterPayments>[] = [
    {
      header: 'Transporter Name',
      accessor: 'transporterName',
      sortable: true,
    },
    {
      header: 'Truck Movements',
      accessor: 'truckCount',
      sortable: true,
    },
    {
      header: 'Total Net Payment (ETB)',
      accessor: 'totalNetPayment',
      sortable: true,
      render: (val) => Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 }),
    },
  ];

  // Daily Report Columns
  const dailyColumns: ColumnDef<DailyReportRow>[] = [
    {
      header: 'Date',
      accessor: 'date',
      sortable: true,
      render: (val) => new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    },
    {
      header: 'Total Deliveries',
      accessor: 'totalDeliveries',
      sortable: true,
    },
    {
      header: 'Total Sales Value (ETB)',
      accessor: 'totalSalesValue',
      sortable: true,
      render: (val) => Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 }),
    },
    {
      header: 'Total Transport Costs (ETB)',
      accessor: 'totalTransportCosts',
      sortable: true,
      render: (val) => Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 }),
    },
    {
      header: 'Shortage Deductions (ETB)',
      accessor: 'totalShortageDeductions',
      sortable: true,
      render: (val) => Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 }),
    },
  ];

  return (
    <div className="space-y-6" style={{ backgroundColor: '#F5F5F7' }}>
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-[32px] font-bold text-[#1D1D1F] mb-2">
          Financial Summary
        </h1>
        <p className="text-[15px] text-[#86868B]">
          Comprehensive overview of customer receivables, supplier payables, and transport payments
        </p>
      </div>

      {/* Date Filter Section */}
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[13px] font-medium text-[#86868B] mb-2">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[13px] font-medium text-[#86868B] mb-2">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleDateFilter} size="md">
              Filter
            </Button>
            <Button variant="outline" onClick={handleResetDates} size="md">
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CurrencyIcon />}
          label="Total Customer Receivables"
          value={`${(summaryData?.totalCustomerReceivables || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB`}
          backgroundColor="bg-blue-50"
          iconColor="text-[#007AFF]"
        />
        <StatCard
          icon={<PaymentIcon />}
          label="Total Supplier Payables"
          value={`${(summaryData?.totalSupplierPayables || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB`}
          backgroundColor="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatCard
          icon={<TrendingUpIcon />}
          label="Total Transport Payable"
          value={`${(summaryData?.totalTransportPayable || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB`}
          backgroundColor="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          icon={<ProfitIcon />}
          label="Net Profit"
          value={`${(summaryData?.metrics?.netProfit || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB`}
          backgroundColor={(summaryData?.metrics?.netProfit ?? 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}
          iconColor={(summaryData?.metrics?.netProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
        />
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex border-b border-[#E8E8ED]">
          {[
            { id: 'receivables', label: 'Customer Receivables', count: summaryData?.customerReceivables?.length || 0 },
            { id: 'payables', label: 'Supplier Payables', count: summaryData?.supplierPayables?.length || 0 },
            { id: 'transport', label: 'Transport Payments', count: summaryData?.transporterPayments?.length || 0 },
            { id: 'daily', label: 'Daily Reports', count: summaryData?.dailyReports?.length || 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-6 py-4 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-[#86868B]">
              Loading summary data...
            </div>
          ) : activeTab === 'receivables' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-[17px] font-bold text-[#1D1D1F] mb-1">
                    Customer Receivables ({summaryData?.customerReceivables?.length || 0})
                  </h3>
                  <p className="text-[13px] text-[#86868B]">
                    Total: {(summaryData?.totalCustomerReceivables || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ETB
                  </p>
                </div>
              </div>
              <Table<CustomerReceivables>
                data={summaryData?.customerReceivables || []}
                columns={receivablesColumns}
                pageSize={10}
                totalPages={1}
                currentPage={1}
                onPageChange={() => {}}
                emptyMessage="No customer receivables found"
              />
            </div>
          ) : activeTab === 'payables' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-[17px] font-bold text-[#1D1D1F] mb-1">
                    Supplier Payables ({summaryData?.supplierPayables?.length || 0})
                  </h3>
                  <p className="text-[13px] text-[#86868B]">
                    Total: {(summaryData?.totalSupplierPayables || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ETB
                  </p>
                </div>
              </div>
              <Table<SupplierPayables>
                data={summaryData?.supplierPayables || []}
                columns={payablesColumns}
                pageSize={10}
                totalPages={1}
                currentPage={1}
                onPageChange={() => {}}
                emptyMessage="No supplier payables found"
              />
            </div>
          ) : activeTab === 'transport' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-[17px] font-bold text-[#1D1D1F] mb-1">
                    Transport Payments ({summaryData?.transporterPayments?.length || 0})
                  </h3>
                  <p className="text-[13px] text-[#86868B]">
                    Total: {(summaryData?.totalTransportPayable || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ETB
                  </p>
                </div>
              </div>
              <Table<TransporterPayments>
                data={summaryData?.transporterPayments || []}
                columns={transporterColumns}
                pageSize={10}
                totalPages={1}
                currentPage={1}
                onPageChange={() => {}}
                emptyMessage="No transporter payments found"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-[17px] font-bold text-[#1D1D1F] mb-1">
                    Daily Report Summary ({summaryData?.dailyReports?.length || 0})
                  </h3>
                  <p className="text-[13px] text-[#86868B]">
                    Total Deliveries: {summaryData?.metrics?.totalDeliveries || 0}
                  </p>
                </div>
              </div>
              <Table<DailyReportRow>
                data={summaryData?.dailyReports || []}
                columns={dailyColumns}
                pageSize={10}
                totalPages={1}
                currentPage={1}
                onPageChange={() => {}}
                emptyMessage="No daily reports found"
              />
            </div>
          )}
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6">
          <h3 className="text-[17px] font-bold text-[#1D1D1F] mb-4">Period Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-[#E8E8ED]">
              <span className="text-[13px] text-[#86868B]">Total Deliveries</span>
              <span className="text-[17px] font-bold text-[#1D1D1F]">
                {summaryData?.metrics?.totalDeliveries || 0}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-[#E8E8ED]">
              <span className="text-[13px] text-[#86868B]">Total Sales Value</span>
              <span className="text-[17px] font-bold text-[#1D1D1F]">
                {(summaryData?.metrics?.totalSalesValue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-[#E8E8ED]">
              <span className="text-[13px] text-[#86868B]">Total Transport Costs</span>
              <span className="text-[17px] font-bold text-[#1D1D1F]">
                {(summaryData?.metrics?.totalTransportCosts || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[#86868B]">Total Shortage Deductions</span>
              <span className="text-[17px] font-bold text-red-600">
                {(summaryData?.metrics?.totalShortageDeductions || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6">
          <h3 className="text-[17px] font-bold text-[#1D1D1F] mb-4">Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-[#E8E8ED]">
              <span className="text-[13px] text-[#86868B]">Customer Receivables</span>
              <span className="text-[17px] font-bold text-[#007AFF]">
                {(summaryData?.totalCustomerReceivables || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-[#E8E8ED]">
              <span className="text-[13px] text-[#86868B]">Supplier Payables</span>
              <span className="text-[17px] font-bold text-orange-600">
                -{(summaryData?.totalSupplierPayables || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-[#E8E8ED]">
              <span className="text-[13px] text-[#86868B]">Transport Payable</span>
              <span className="text-[17px] font-bold text-purple-600">
                -{(summaryData?.totalTransportPayable || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-[13px] font-semibold text-[#1D1D1F]">Net Profit</span>
              <span className={`text-[19px] font-bold ${(summaryData?.metrics.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(summaryData?.metrics.netProfit || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} ETB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Links */}
      <div className="flex gap-3 justify-center pb-8">
        <Link href="/dashboard/aggregate">
          <Button variant="outline">
            Back to Aggregate Deliveries
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
