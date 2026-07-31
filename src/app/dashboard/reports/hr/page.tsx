'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Table, Badge } from '@/components/ui';
import { StatCard } from '@/components/ui/Card';
import type { ColumnDef } from '@/components/ui';

interface HRRecord {
  id: number;
  employeeNo: string;
  name: string;
  department: string;
  position: string;
  salary: number;
  type: string;
  hireDate: string;
  status: string;
}

interface DeptSummary {
  department: string;
  count: number;
  avgSalary: number;
}

export default function HRReportsPage() {
  const [data, setData] = useState<HRRecord[]>([]);
  const [deptSummary, setDeptSummary] = useState<DeptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?type=hr&page=${currentPage}&limit=${pageSize}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data.records);
          setDeptSummary(json.data.departmentSummary || []);
          setTotalPages(json.data.pagination?.pages || 0);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [currentPage]);

  const totalEmployees = deptSummary.reduce((sum, d) => sum + d.count, 0);
  const totalSalary = data.reduce((sum, e) => sum + Number(e.salary), 0);

  const employeeColumns: ColumnDef<HRRecord>[] = [
    { header: 'Employee No', accessor: 'employeeNo', sortable: true },
    { header: 'Name', accessor: 'name', sortable: true },
    { header: 'Department', accessor: 'department' },
    { header: 'Position', accessor: 'position' },
    { header: 'Salary (ETB)', accessor: 'salary', render: (val) => Number(val).toLocaleString('en-US') },
    { header: 'Type', accessor: 'type' },
    { header: 'Hire Date', accessor: 'hireDate', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { header: 'Status', accessor: 'status', render: (status) => <Badge status={status as any}>{status}</Badge> },
  ];

  const deptColumns: ColumnDef<DeptSummary>[] = [
    { header: 'Department', accessor: 'department', sortable: true },
    { header: 'Employees', accessor: 'count' },
    { header: 'Avg Salary (ETB)', accessor: 'avgSalary', render: (val) => Number(val).toLocaleString('en-US') },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">HR Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Active Employees" value={totalEmployees} icon={<span>👥</span>} backgroundColor="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Total Salary Bill" value={`${totalSalary.toLocaleString('en-US')} ETB`} icon={<span>💰</span>} backgroundColor="bg-green-50" iconColor="text-green-600" />
        <StatCard label="Departments" value={deptSummary.length} icon={<span>🏢</span>} backgroundColor="bg-purple-50" iconColor="text-purple-600" />
      </div>

      {deptSummary.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold">Department Summary</h2></CardHeader>
          <CardBody>
            <Table<DeptSummary>
              data={deptSummary}
              columns={deptColumns}
              pageSize={50}
              totalPages={1}
              currentPage={1}
              onPageChange={() => {}}
              emptyMessage="No department data"
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader><h2 className="text-lg font-semibold">Employee List</h2></CardHeader>
        <CardBody>
          <Table<HRRecord>
            data={data}
            columns={employeeColumns}
            pageSize={pageSize}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No employees found'}
          />
        </CardBody>
      </Card>
    </div>
  );
}
