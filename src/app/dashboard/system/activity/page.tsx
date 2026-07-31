'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { Card, CardBody, Table, Badge, Input, Select } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';

interface ActivityLog {
  id: number;
  action: string;
  module: string;
  details: string;
  user: { firstName: string; lastName: string; email: string };
  createdAt: string;
}

export default function ActivityLogPage() {
  const { t } = useI18n();
  const [data, setData] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(pageSize),
        });
        if (searchTerm) params.set('search', searchTerm);
        if (moduleFilter) params.set('module', moduleFilter);

        const res = await fetch(`/api/activity?${params}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setTotalPages(json.pagination?.pages || 0);
          setTotal(json.pagination?.total || 0);
        } else {
          setError(json.error);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentPage, searchTerm, moduleFilter]);

  const columns: ColumnDef<ActivityLog>[] = [
    {
      header: 'Timestamp',
      accessor: 'createdAt',
      render: (val) => val ? new Date(val).toLocaleString('en-US') : '-',
      sortable: true,
    },
    {
      header: 'User',
      accessor: 'user',
      render: (_val, row) => row.user ? `${row.user.firstName} ${row.user.lastName}` : '-',
    },
    { header: 'Action', accessor: 'action' },
    { header: 'Module', accessor: 'module', sortable: true },
    { header: 'Details', accessor: 'details' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Activity Log</h1>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search activities..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
            <Select
              options={[
                { value: '', label: 'All Modules' },
                { value: 'Sales', label: 'Sales' },
                { value: 'Purchase', label: 'Purchase' },
                { value: 'Finance', label: 'Finance' },
                { value: 'HR', label: 'HR' },
                { value: 'Medical', label: 'Medical' },
                { value: 'Aggregate', label: 'Aggregate' },
                { value: 'Cement', label: 'Cement' },
                { value: 'System', label: 'System' },
              ]}
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${total} activities`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<ActivityLog>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No activity logs found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
