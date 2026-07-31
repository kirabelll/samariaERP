'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardBody, Button } from '@/components/ui';
import { ChevronRight, Plus, Search, Eye, Edit2, Trash2 } from 'lucide-react';

interface Association {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  status: string;
  transporterCount: number;
}

export default function TransportAssociationsPage() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAssociations();
  }, [search, page]);

  const fetchAssociations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
      });
      const res = await fetch(`/api/transport-associations?${params}`);
      const data = await res.json();
      if (data.success) {
        setAssociations(data.data);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching associations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this association?')) return;
    try {
      const res = await fetch(`/api/transport-associations/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('Association deleted successfully');
        fetchAssociations();
      } else {
        alert(data.error || 'Failed to delete association');
      }
    } catch (error) {
      console.error('Error deleting association:', error);
      alert('Error deleting association');
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button className="text-blue-600 hover:text-blue-700 font-medium">
          Transporters
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 font-medium">Transport Associations</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
            Transport Associations
          </h1>
          <p className="text-slate-600 mt-2">Manage transport company associations</p>
        </div>
        <Link href="/dashboard/transporters/associations/new">
          <Button variant="primary" size="lg" className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Association
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <Card>
        <CardBody className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </CardBody>
      </Card>

      {/* Associations List */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-600">Loading...</div>
          ) : associations.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              No associations found. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Contact Person</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Transporters</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {associations.map((assoc) => (
                    <tr key={assoc.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{assoc.code}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{assoc.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{assoc.contactPerson || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{assoc.phone || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {assoc.transporterCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          assoc.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {assoc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/transporters/associations/${assoc.id}`}>
                            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="View">
                              <Eye className="w-4 h-4 text-slate-600" />
                            </button>
                          </Link>
                          <Link href={`/dashboard/transporters/associations/${assoc.id}/edit`}>
                            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Edit">
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDelete(assoc.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
