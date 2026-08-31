'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardBody, CardFooter, Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import FileUpload from '@/components/ui/FileUpload';
import { uploadDocument, fetchDocuments } from '@/lib/upload-helper';

// Known sub-routes that should not be treated as delivery IDs
const KNOWN_SUBROUTES = ['commission', 'recoveries', 'daily', 'new', 'proofs', 'summary', 'shortage'];

interface DeliveryData {
  id: string;
  dispatchNo: string;
  customerId: string;
  supplierId: string;
  transporterId: string;
  truckId: string;
  itemId: string;
  padNumber: string | null;
  loadedVolume: number;
  deliveredVolume: number | null;
  shortageVolume: number | null;
  transportRate: number;
  aggregateValue: number;
  grossTruckFee: number;
  shortageDeduction: number | null;
  netTruckPayment: number;
  status: string;
  dispatchDate: string;
  deliveryDate: string | null;
  customerPrice?: number;
  supplierPrice?: number;
  customerReceivable?: number;
  supplierPayable?: number;
  netAmount?: number;
  customer: {
    id: string;
    companyName: string;
    code: string;
  } | null;
  supplier: {
    id: string;
    companyName: string;
    code: string;
  } | null;
  transporter: {
    id: string;
    companyName: string;
    code: string;
  } | null;
  truck: {
    id: string;
    plateNo: string;
    truckType?: string;
  } | null;
  item: {
    id: string;
    name: string;
    code: string;
    unit: string;
  } | null;
}

export default function AggregateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deliveredVolumeInput, setDeliveredVolumeInput] = useState('');
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [telegramFiles, setTelegramFiles] = useState<File[]>([]);
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [padNumberInput, setPadNumberInput] = useState('');
  const [savingPadNumber, setSavingPadNumber] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/aggregate/${id}?permanent=true`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (res.ok && result.success) {
        alert('Aggregate dispatch deleted successfully');
        router.push('/dashboard/aggregate');
      } else {
        alert(result.error || 'Failed to delete aggregate dispatch');
      }
    } catch (err: any) {
      alert('Error deleting dispatch: ' + err.message);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  useEffect(() => {
    // Check if the id is a known sub-route and redirect if necessary
    if (id && KNOWN_SUBROUTES.includes(id)) {
      router.push(`/dashboard/aggregate/${id}`);
      return;
    }

    const fetchDelivery = async () => {
      try {
        const res = await fetch(`/api/aggregate/${id}`);
        const data = await res.json();

        if (data.success) {
          setDelivery(data.data);
        } else {
          setError(data.error || 'Failed to load delivery');
        }
      } catch (err) {
        console.error('Error fetching delivery:', err);
        setError('Failed to load delivery');
      } finally {
        setLoading(false);
      }
    };

    if (id && !KNOWN_SUBROUTES.includes(id)) {
      fetchDelivery();
    }
  }, [id, router]);

  // Fetch documents for this delivery
  useEffect(() => {
    if (id && !KNOWN_SUBROUTES.includes(id)) {
      fetchDocuments('AGGREGATE', id).then(setDocuments).catch(() => setDocuments([]));
    }
  }, [id]);

  const handleUploadDocuments = async () => {
    if (telegramFiles.length === 0 && invoiceFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }
    setUploading(true);
    try {
      for (const file of telegramFiles) {
        await uploadDocument(file, 'AGGREGATE', id, 'telegram_proof');
      }
      for (const file of invoiceFiles) {
        await uploadDocument(file, 'AGGREGATE', id, 'signed_invoice');
      }
      // Refresh documents
      const docs = await fetchDocuments('AGGREGATE', id);
      setDocuments(docs);
      setTelegramFiles([]);
      setInvoiceFiles([]);
      alert('Documents uploaded successfully');
    } catch (err: any) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/aggregate');
  };

  const handleConfirmDelivery = async () => {
    if (!deliveredVolumeInput || isNaN(parseFloat(deliveredVolumeInput))) {
      alert('Please enter a valid delivered volume');
      return;
    }
    const vol = parseFloat(deliveredVolumeInput);
    if (vol <= 0) {
      alert('Delivered volume must be greater than zero');
      return;
    }
    if (!confirm(`Confirm delivery of ${vol.toFixed(2)} m³? This will update the status to Delivered.`)) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/aggregate/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Delivered',
          deliveredVolume: vol,
          deliveryDate: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to confirm delivery');
      setDelivery(json.data);
      setShowDeliveryForm(false);
      setDeliveredVolumeInput('');
      alert('Delivery confirmed successfully');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleVerify = async () => {
    const padNo = padNumberInput.trim() || delivery?.padNumber?.trim();
    if (!padNo) {
      alert('Cannot verify: Delivery Pad / Receipt Number is mandatory. Please enter and save the Delivery Pad / Receipt Number first.');
      return;
    }
    if (!confirm('Verify this delivery? This confirms the shortage calculations are correct.')) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/aggregate/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Verified' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to verify');
      setDelivery(json.data);
      alert('Delivery verified successfully');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSavePadNumber = async () => {
    if (!padNumberInput.trim()) return;
    setSavingPadNumber(true);
    try {
      const res = await fetch(`/api/aggregate/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ padNumber: padNumberInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save');
      setDelivery(json.data);
      alert('Pad number saved');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSavingPadNumber(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <button
            onClick={handleBack}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Aggregate Operations
          </button>
          <span>/</span>
          <span className="text-slate-900 font-medium">Loading...</span>
        </div>
        <Card>
          <CardBody>
            <div className="text-center py-8 text-slate-600">Loading delivery details...</div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <button
            onClick={handleBack}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Aggregate Operations
          </button>
          <span>/</span>
          <span className="text-slate-900 font-medium">Error</span>
        </div>
        <Card>
          <CardBody>
            <div className="text-center py-8 text-red-600">{error || 'Delivery not found'}</div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Aggregate Operations
        </button>
        <span>/</span>
        <span className="text-slate-900 font-medium">{delivery.dispatchNo}</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{delivery.dispatchNo}</h1>
          <p className="text-slate-600 mt-2">
            Dispatch Date: {new Date(delivery.dispatchDate).toLocaleDateString()}
            {delivery.padNumber && <span className="ml-4">Pad #: <strong>{delivery.padNumber}</strong></span>}
          </p>
        </div>
        <div className="flex gap-2">
          {delivery.status === 'Delivered' && (
            <Button
              variant="primary"
              size="lg"
              onClick={handleVerify}
              disabled={updating}
              className="bg-green-600 hover:bg-green-700"
            >
              {updating ? 'Verifying...' : 'Verify'}
            </Button>
          )}
          {delivery.status === 'Verified' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Settlement occurs automatically when payment is processed via Payment Voucher or Bank Transaction.
            </span>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push(`/dashboard/aggregate/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete
          </Button>
          <Button variant="outline" size="lg" onClick={handleBack}>
            Back
          </Button>
        </div>
      </div>

      {/* Documents — at the top */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
        </CardHeader>
        <CardBody>
          {/* Existing documents */}
          {documents.length > 0 ? (
            <div className="space-y-2 mb-6">
              <h3 className="text-sm font-medium text-slate-700">Attached Documents ({documents.length})</h3>
              <div className="divide-y divide-slate-200">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {doc.docType === 'telegram_proof' ? '📱' : doc.docType === 'signed_invoice' ? '📄' : '📎'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{doc.fileName}</p>
                        <p className="text-xs text-slate-500">
                          {doc.docType === 'telegram_proof' ? 'Telegram Proof' : doc.docType === 'signed_invoice' ? 'Signed Invoice' : doc.docType}
                          {' · '}
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <a
                      href={doc.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View / Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 mb-6">No documents attached yet</p>
          )}

          {/* Upload new documents */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-700">Upload Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUpload
                label="Telegram Proof"
                onFilesSelected={setTelegramFiles}
                multiple
                accept="image/*,.pdf"
              />
              <FileUpload
                label="Signed Invoice"
                onFilesSelected={setInvoiceFiles}
                multiple
                accept="image/*,.pdf"
              />
            </div>
            {(telegramFiles.length > 0 || invoiceFiles.length > 0) && (
              <Button variant="primary" onClick={handleUploadDocuments} disabled={uploading}>
                {uploading ? 'Uploading...' : `Upload ${telegramFiles.length + invoiceFiles.length} file(s)`}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dispatch Details */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Dispatch Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                delivery.status === 'Dispatched'
                  ? 'bg-blue-100 text-blue-800'
                  : delivery.status === 'Delivered'
                  ? 'bg-green-100 text-green-800'
                  : delivery.status === 'Cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {delivery.status}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dispatch No</label>
              <p className="text-slate-900 font-medium">{delivery.dispatchNo}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Delivery Pad / POD / Receipt Number</label>
              <p className="text-slate-900 font-medium">{delivery.padNumber || '-'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer</label>
              <p className="text-slate-900">{delivery.customer?.companyName} ({delivery.customer?.code})</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Supplier</label>
              <p className="text-slate-900">{delivery.supplier?.companyName} ({delivery.supplier?.code})</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Item</label>
              <p className="text-slate-900">{delivery.item?.name} ({delivery.item?.code})</p>
            </div>
          </CardBody>
        </Card>

        {/* Transport Details */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Transport Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Transporter</label>
              <p className="text-slate-900">{delivery.transporter?.companyName} ({delivery.transporter?.code})</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Truck Plate</label>
              <p className="text-slate-900 font-medium">{delivery.truck?.plateNo}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Truck Type</label>
              <p className="text-slate-900">{delivery.truck?.truckType || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dispatch Date</label>
              <p className="text-slate-900">{new Date(delivery.dispatchDate).toLocaleDateString()}</p>
            </div>
            {delivery.deliveryDate && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Delivery Date</label>
                <p className="text-slate-900">{new Date(delivery.deliveryDate).toLocaleDateString()}</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Volumes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardBody className="space-y-2">
            <label className="block text-xs font-medium text-slate-600">Loaded Volume (m³)</label>
            <p className="text-2xl font-bold text-slate-900">{delivery.loadedVolume.toFixed(2)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <label className="block text-xs font-medium text-slate-600">Delivered Volume (m³)</label>
            <p className="text-2xl font-bold text-slate-900">{delivery.deliveredVolume?.toFixed(2) || 'N/A'}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <label className="block text-xs font-medium text-slate-600">Shortage Volume (m³)</label>
            <p className={`text-2xl font-bold ${delivery.shortageVolume && delivery.shortageVolume > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {delivery.shortageVolume?.toFixed(2) || '0.00'}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Financial Summary</h2>
        </CardHeader>
        <CardBody>
          {(() => {
            const custPrice = delivery.customerPrice ?? Number(delivery.aggregateValue || 0);
            const suppPrice = delivery.supplierPrice ?? Number(delivery.aggregateValue || 0);
            const loadedVol = delivery.loadedVolume || 0;
            const deliveredVol = delivery.deliveredVolume ?? delivery.loadedVolume ?? 0;
            const custReceivable = loadedVol * custPrice;
            const suppPayable = deliveredVol * suppPrice;
            const netMatAmount = custReceivable - suppPayable;

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Transport Rate (ETB/m³)</label>
                    <p className="text-2xl font-bold text-slate-900">{delivery.transportRate.toFixed(2)}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Total Amount (ETB)</label>
                    <p className="text-2xl font-bold text-slate-900">
                      {(deliveredVol * delivery.aggregateValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Accounts Receivable & Payable */}
                <div className="border-t pt-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Material Accounts Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                      <label className="block text-xs font-medium text-emerald-800 mb-1">Customer Receivable (ETB)</label>
                      <p className="text-2xl font-bold text-emerald-900">
                        {custReceivable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-emerald-700 mt-1">
                        Loaded Vol ({loadedVol.toFixed(2)} m³) × {custPrice.toFixed(2)} ETB/m³
                      </p>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <label className="block text-xs font-medium text-amber-800 mb-1">Supplier Payable (ETB)</label>
                      <p className="text-2xl font-bold text-amber-900">
                        {suppPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Delivered Vol ({deliveredVol.toFixed(2)} m³) × {suppPrice.toFixed(2)} ETB/m³
                      </p>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                      <label className="block text-xs font-medium text-indigo-800 mb-1">Net Material Amount (ETB)</label>
                      <p className={`text-2xl font-bold ${netMatAmount >= 0 ? 'text-indigo-900' : 'text-red-600'}`}>
                        {netMatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-indigo-700 mt-1">Customer Receivable − Supplier Payable</p>
                    </div>
                  </div>
                </div>

                {/* Transport Fees */}
                <div className="border-t pt-4 space-y-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transport Fee & Payment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Gross Truck Fee (ETB)</label>
                      <p className="text-2xl font-bold text-slate-900">{Number(delivery.grossTruckFee).toLocaleString('en-US')}</p>
                    </div>
                    {delivery.shortageDeduction !== null && (
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Shortage Deduction (ETB)</label>
                        <p className="text-2xl font-bold text-red-600">{Number(delivery.shortageDeduction).toLocaleString('en-US')}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <label className="block text-sm font-medium text-slate-600 mb-2">Net Truck Payment (ETB)</label>
                    <p className="text-3xl font-bold text-green-700">{Number(delivery.netTruckPayment).toLocaleString('en-US')}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardBody>
      </Card>

      {/* Confirm Delivery — at the bottom */}
      {delivery.status === 'Dispatched' && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Confirm Delivery</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loaded Volume (m³)</label>
                  <p className="text-lg font-bold text-slate-900">{delivery.loadedVolume.toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Delivered Volume (m³)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={deliveredVolumeInput || String(delivery.loadedVolume)}
                    onChange={(e) => setDeliveredVolumeInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-lg font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter delivered volume"
                  />
                </div>
              </div>
              {(deliveredVolumeInput || String(delivery.loadedVolume)) && parseFloat(deliveredVolumeInput || String(delivery.loadedVolume)) < delivery.loadedVolume && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
                  <strong>Shortage detected:</strong>{' '}
                  {(delivery.loadedVolume - parseFloat(deliveredVolumeInput || String(delivery.loadedVolume))).toFixed(2)} m³
                  (Deduction: ETB {((delivery.loadedVolume - parseFloat(deliveredVolumeInput || String(delivery.loadedVolume))) * delivery.aggregateValue).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="primary" size="lg" onClick={() => {
                  if (!deliveredVolumeInput) setDeliveredVolumeInput(String(delivery.loadedVolume));
                  handleConfirmDelivery();
                }} disabled={updating}>
                  {updating ? 'Confirming...' : 'Confirm Delivery'}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Footer */}
      <Card>
        <CardFooter>
          <div className="flex gap-3 w-full justify-end">
            <Button variant="outline" size="lg" onClick={handleBack}>
              Back
            </Button>
          </div>
        </CardFooter>
      </Card>

      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Aggregate Dispatch"
        message={`Are you sure you want to permanently delete dispatch ${delivery.dispatchNo}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={deleting}
      />
    </div>
  );
}
