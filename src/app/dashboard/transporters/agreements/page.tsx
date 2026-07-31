'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardBody, Button, Badge, Input, Select } from '@/components/ui';
import { Eye } from 'lucide-react';

interface Transporter {
  companyName: string;
  code: string;
}

interface Agreement {
  id: string;
  agreementNo: string;
  transporterId: string;
  productType: string;
  validFrom: string;
  validTo: string;
  status: 'Active' | 'Expired' | 'Cancelled';
  transporter: Transporter;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ApiResponse {
  success: boolean;
  data: Agreement[];
  pagination: Pagination;
}

export default function TransportAgreementsPage() {
  const searchParams = useSearchParams();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'All');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', '10');
        if (search) params.append('search', search);
        if (status && status !== 'All') params.append('status', status);

        const response = await fetch(`/api/transporters/agreements?${params.toString()}`);
        const data: ApiResponse = await response.json();

        if (data.success) {
          setAgreements(data.data);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error('Failed to fetch agreements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgreements();
  }, [currentPage, search, status]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatus(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
              Transport Agreements
            </h1>
            <p className="text-slate-600 mt-2">
              Manage transporter agreements and pricing
            </p>
          </div>
          <Link href="/dashboard/transporters/agreements/new">
            <Button className="w-full sm:w-auto">
              + New Agreement
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search
                </label>
                <Input
                  placeholder="Search by agreement no, transporter..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <Select
                  value={status}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="w-full"
                  options={[
                    { value: 'All', label: 'All' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Expired', label: 'Expired' },
                    { value: 'Cancelled', label: 'Cancelled' },
                  ]}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">
              Agreements ({pagination.total})
            </h2>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : agreements.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600">No agreements found</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                          Agreement No
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                          Transporter
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                          Product Type
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                          Valid From
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                          Valid To
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {agreements.map((agreement) => (
                        <tr
                          key={agreement.id}
                          className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">
                            {agreement.agreementNo}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            <div>
                              <p className="font-medium">
                                {agreement.transporter.companyName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {agreement.transporter.code}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            <span className="capitalize">
                              {agreement.productType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {formatDate(agreement.validFrom)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {formatDate(agreement.validTo)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Badge status={agreement.status}>
                              {agreement.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Link
                              href={`/dashboard/transporters/agreements/${agreement.id}`}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {agreements.map((agreement) => (
                    <div
                      key={agreement.id}
                      className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {agreement.agreementNo}
                          </p>
                          <p className="text-sm text-slate-600">
                            {agreement.transporter.companyName}
                          </p>
                        </div>
                        <Badge status={agreement.status}>
                          {agreement.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-slate-600">Product Type</p>
                          <p className="font-medium text-slate-900 capitalize">
                            {agreement.productType}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-600">Valid From</p>
                          <p className="font-medium text-slate-900">
                            {formatDate(agreement.validFrom)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-600">Valid To</p>
                          <p className="font-medium text-slate-900">
                            {formatDate(agreement.validTo)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-600">Code</p>
                          <p className="font-medium text-slate-900">
                            {agreement.transporter.code}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/transporters/agreements/${agreement.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-6 pt-6 border-t border-slate-200">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                    <button
                      onClick={() =>
                        setCurrentPage(Math.min(pagination.pages, currentPage + 1))
                      }
                      disabled={currentPage === pagination.pages}
                      className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
