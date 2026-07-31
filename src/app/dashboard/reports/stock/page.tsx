'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, Table, Badge } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';

interface StockRecord {
  id: number;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  warehouse: string;
  quantity: number;
  minQuantity: number;
  isLow: boolean;
}

export default function StockReportsPage() {
  const [data, setData] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?type=stock&page=${currentPage}&limit=${pageSize}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data.records);
          setTotalPages(json.data.pagination?.pages || 0);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [currentPage]);

  const columns: ColumnDef<StockRecord>[] = [
    { header: 'Item Code', accessor: 'itemCode', sortable: true },
    { header: 'Item Name', accessor: 'itemName', sortable: true },
    { header: 'Category', accessor: 'category' },
    { header: 'Unit', accessor: 'unit' },
    { header: 'Warehouse', accessor: 'warehouse' },
    {
      header: 'Quantity',
      accessor: 'quantity',
      render: (val, row) => (
        <span className={row.isLow ? 'text-red-600 font-bold' : ''}>
          {Number(val).toLocaleString('en-US')}
          {row.isLow && ' (LOW)'}
        </span>
      ),
    },
    { header: 'Min Qty', accessor: 'minQuantity', render: (val) => Number(val).toLocaleString('en-US') },
    {
      header: 'Status',
      accessor: 'isLow',
      render: (isLow) => <Badge status={isLow ? 'Inactive' : 'Active'}>{isLow ? 'Low Stock' : 'OK'}</Badge>,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Stock Reports</h1>

      <Card>
        <CardBody>
          <Table<StockRecord>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading stock report...' : 'No stock data found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
