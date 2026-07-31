'use client';

import React, { useState } from 'react';
import { Card, CardBody, Table, Badge, Button, Input, Select, Modal } from '@/components/ui';
import type { ColumnDef } from '@/components/ui';
import { useApiList } from '@/hooks/useApi';
import FileUpload from '@/components/ui/FileUpload';
import { uploadDocument } from '@/lib/upload-helper';

interface DocumentRecord {
  id: string;
  module: string;
  recordId: string;
  docType: string;
  filePath: string;
  fileName: string;
  uploadedBy: string | null;
  uploadedAt: string;
  verified: boolean;
}

export default function DocumentManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadModule, setUploadModule] = useState('GENERAL');
  const [uploadDocType, setUploadDocType] = useState('general');
  const [uploading, setUploading] = useState(false);
  const pageSize = 20;

  const { data, pagination, loading, error, refetch } = useApiList<DocumentRecord>('/api/documents', {
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    filters: { module: moduleFilter },
  });

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      alert('Please select at least one file');
      return;
    }
    setUploading(true);
    try {
      for (const file of uploadFiles) {
        await uploadDocument(file, uploadModule, 'general', uploadDocType);
      }
      alert('Files uploaded successfully!');
      setShowUploadModal(false);
      setUploadFiles([]);
      refetch();
    } catch {
      alert('Failed to upload files');
    }
    setUploading(false);
  };

  const columns: ColumnDef<DocumentRecord>[] = [
    { header: 'File Name', accessor: 'fileName', sortable: true },
    {
      header: 'Module',
      accessor: 'module',
      render: (val) => <Badge status="info">{val}</Badge>,
    },
    { header: 'Document Type', accessor: 'docType' },
    {
      header: 'Uploaded',
      accessor: 'uploadedAt',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    { header: 'Uploaded By', accessor: 'uploadedBy', render: (val) => val || '-' },
    {
      header: 'Verified',
      accessor: 'verified',
      render: (val) => val ? <Badge status="Active">Verified</Badge> : <Badge status="Pending">Unverified</Badge>,
    },
    {
      header: 'Actions',
      accessor: 'filePath',
      render: (filePath) => (
        <a href={filePath} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline">Download</Button>
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Document Management</h1>
        <Button variant="primary" size="lg" onClick={() => setShowUploadModal(true)}>
          + Upload Document
        </Button>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              placeholder="Search by file name..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
            <Select
              options={[
                { value: '', label: 'All Modules' },
                { value: 'GENERAL', label: 'General' },
                { value: 'SALES', label: 'Sales' },
                { value: 'PURCHASING', label: 'Purchasing' },
                { value: 'MEDICAL', label: 'Medical' },
                { value: 'AGGREGATE', label: 'Aggregate' },
                { value: 'CEMENT', label: 'Cement' },
                { value: 'HR', label: 'HR' },
                { value: 'FINANCE', label: 'Finance' },
              ]}
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${data.length} of ${pagination.total} documents`}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          {error && <div className="text-red-600 mb-4">Error: {error}</div>}
          <Table<DocumentRecord>
            data={data}
            columns={columns}
            pageSize={pageSize}
            totalPages={pagination.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            emptyMessage={loading ? 'Loading...' : 'No documents found'}
          />
        </CardBody>
      </Card>

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Document"
        body={
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                <select
                  value={uploadModule}
                  onChange={(e) => setUploadModule(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GENERAL">General</option>
                  <option value="SALES">Sales</option>
                  <option value="PURCHASING">Purchasing</option>
                  <option value="MEDICAL">Medical</option>
                  <option value="AGGREGATE">Aggregate</option>
                  <option value="CEMENT">Cement</option>
                  <option value="HR">HR</option>
                  <option value="FINANCE">Finance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General Document</option>
                  <option value="contract">Contract</option>
                  <option value="invoice">Invoice</option>
                  <option value="license">License</option>
                  <option value="certificate">Certificate</option>
                  <option value="report">Report</option>
                  <option value="deposit_slip">Deposit Slip</option>
                  <option value="telegram_proof">Telegram Proof</option>
                  <option value="weighbridge">Weighbridge Ticket</option>
                </select>
              </div>
            </div>
            <FileUpload
              onFilesSelected={(files) => setUploadFiles(files)}
              label="Select Files"
              maxFiles={5}
              maxFileSize={10 * 1024 * 1024}
              helperText="Upload PDFs, images, or office documents (max 10MB each)"
            />
          </div>
        }
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUpload} isLoading={uploading} disabled={uploadFiles.length === 0}>
              Upload {uploadFiles.length > 0 ? `(${uploadFiles.length} files)` : ''}
            </Button>
          </div>
        }
      />
    </div>
  );
}
