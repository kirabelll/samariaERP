'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardBody, CardFooter, Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/Modal';
import FileUpload from '@/components/ui/FileUpload';
import { uploadDocument, fetchDocuments } from '@/lib/upload-helper';
import {
  FileText,
  CheckCircle2,
  ExternalLink,
  Layers,
  Building2,
  Calendar,
  MapPin,
  TrendingUp,
  Tag,
  Boxes,
  Truck,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

// Known sub-routes that should not be treated
const KNOWN_SUBROUTES = ['commission', 'recoveries', 'daily', 'new', 'proofs', 'summary', 'shortage'];

interface AgreementItem {
  itemId?: string;
  itemName: string;
  itemCode?: string;
  type?: string;
  unit: string;
  unitPrice: number;
  qty: number;
  totalAmount: number;
  description?: string;
  isMatched?: boolean;
}

interface CustomerAgreementData {
  id: string;
  agreementNo: string;
  status: string;
  validFrom: string;
  validTo: string;
  offloadingSite?: string | null;
  terms?: string | null;
  totalAmount?: number;
  items: AgreementItem[];
  matchedItem?: AgreementItem | null;
}

interface SupplierAgreementData {
  id: string;
  agreementNo: string;
  status: string;
  validFrom: string;
  validTo: string;
  loadingSite?: string | null;
  offloadingSite?: string | null;
  terms?: string | null;
  totalAmount?: number;
  items: AgreementItem[];
  matchedItem?: AgreementItem | null;
}

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
  customerAgreement?: CustomerAgreementData | null;
  supplierAgreement?: SupplierAgreementData | null;
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
        const res = await fetch(`/api/aggregate/${id}`, { cache: 'no-store' });
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

      {/* Customer & Supplier Agreements & Item Pricing */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              Customer & Supplier Agreements and Item Pricing
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Contractual rates and full item price schedules
          </span>
        </div>

        {/* Pricing Spread & Margin Banner */}
        <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-emerald-50 rounded-xl p-4 border border-blue-200/80 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-xs font-medium text-slate-600">Current Item</span>
              <p className="text-sm font-bold text-slate-900 truncate" title={delivery.item?.name || 'N/A'}>
                {delivery.item?.name || 'N/A'}
              </p>
              <span className="text-[11px] text-slate-500 font-mono">Code: {delivery.item?.code || '—'}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-emerald-700">Customer Sale Price</span>
              <p className="text-lg font-bold text-emerald-900 font-mono">
                {Number(delivery.customerPrice ?? delivery.aggregateValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB/m³
              </p>
              <span className="text-[11px] text-emerald-600">
                {delivery.customerAgreement ? `Agreement ${delivery.customerAgreement.agreementNo}` : 'Dispatch rate'}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-amber-700">Supplier Purchase Price</span>
              <p className="text-lg font-bold text-amber-900 font-mono">
                {Number(delivery.supplierPrice ?? delivery.aggregateValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB/m³
              </p>
              <span className="text-[11px] text-amber-600">
                {delivery.supplierAgreement ? `Agreement ${delivery.supplierAgreement.agreementNo}` : 'Dispatch rate'}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-indigo-700">Material Margin / Spread</span>
              <p className="text-lg font-bold text-indigo-900 font-mono">
                {(Number(delivery.customerPrice ?? delivery.aggregateValue ?? 0) - Number(delivery.supplierPrice ?? delivery.aggregateValue ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB/m³
              </p>
              <span className="text-[11px] text-indigo-600">
                Gross Spread: {((delivery.loadedVolume || 0) * (Number(delivery.customerPrice ?? delivery.aggregateValue ?? 0) - Number(delivery.supplierPrice ?? delivery.aggregateValue ?? 0))).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Customer Agreement vs Supplier Agreement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Sales Agreement Card */}
          <Card className="border-emerald-200/80 shadow-xs">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-emerald-600 text-white">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Customer Sales Agreement</h3>
                    <p className="text-xs text-slate-500">{delivery.customer?.companyName || 'Unknown Customer'}</p>
                  </div>
                </div>
                {delivery.customerAgreement ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    delivery.customerAgreement.status === 'Active' || delivery.customerAgreement.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {delivery.customerAgreement.status}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    No Agreement
                  </span>
                )}
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {delivery.customerAgreement ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg text-xs border border-slate-200/80">
                    <div>
                      <span className="text-slate-500 block">Agreement No</span>
                      <Link
                        href={`/dashboard/sales/agreements`}
                        className="font-mono font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>{delivery.customerAgreement.agreementNo}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Validity Period</span>
                      <span className="font-medium text-slate-800">
                        {new Date(delivery.customerAgreement.validFrom).toLocaleDateString()} - {new Date(delivery.customerAgreement.validTo).toLocaleDateString()}
                      </span>
                    </div>
                    {delivery.customerAgreement.offloadingSite && (
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block">Offloading Site</span>
                        <span className="font-medium text-slate-800 truncate block" title={delivery.customerAgreement.offloadingSite}>
                          {delivery.customerAgreement.offloadingSite}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Highlight for Current Dispatch Item */}
                  {delivery.customerAgreement.matchedItem && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Matched Dispatch Item Rate
                        </span>
                        <p className="text-xs font-semibold text-slate-900 mt-0.5">
                          {delivery.customerAgreement.matchedItem.itemName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold font-mono text-emerald-900">
                          {Number(delivery.customerAgreement.matchedItem.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                        </span>
                        <span className="text-[10px] text-emerald-700 block">per {delivery.customerAgreement.matchedItem.unit || 'm³'}</span>
                      </div>
                    </div>
                  )}

                  {/* All Agreement Items Table */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700">Contracted Items & Prices ({delivery.customerAgreement.items.length})</span>
                      {delivery.customerAgreement.totalAmount ? (
                        <span className="text-xs text-slate-500">
                          Contract Value: <strong className="text-slate-800 font-mono">{Number(delivery.customerAgreement.totalAmount).toLocaleString('en-US')} ETB</strong>
                        </span>
                      ) : null}
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-2.5">Item Name</th>
                            <th className="py-2 px-2.5 text-right">Contract Qty</th>
                            <th className="py-2 px-2.5 text-right">Unit Price (ETB)</th>
                            <th className="py-2 px-2.5 text-right">Total (ETB)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {delivery.customerAgreement.items.map((it, idx) => (
                            <tr key={idx} className={it.isMatched ? 'bg-emerald-50/70 font-medium' : 'hover:bg-slate-50'}>
                              <td className="py-2 px-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span>{it.itemName}</span>
                                  {it.isMatched && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-600 text-white">
                                      Current
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                                {it.qty.toLocaleString('en-US')} {it.unit}
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-900">
                                {it.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                                {it.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No Active Customer Agreement Found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Pricing defaults to dispatch override or standard rate ({delivery.customerPrice?.toFixed(2) || delivery.aggregateValue.toFixed(2)} ETB/m³).
                  </p>
                  <Link
                    href="/dashboard/sales/agreements/new"
                    className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    <span>Create Customer Agreement</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Supplier Purchase Agreement Card */}
          <Card className="border-amber-200/80 shadow-xs">
            <CardHeader className="bg-amber-50/50 border-b border-amber-100 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-amber-600 text-white">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Supplier Purchase Agreement</h3>
                    <p className="text-xs text-slate-500">{delivery.supplier?.companyName || 'Unknown Supplier'}</p>
                  </div>
                </div>
                {delivery.supplierAgreement ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    delivery.supplierAgreement.status === 'Active' || delivery.supplierAgreement.status === 'Approved'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {delivery.supplierAgreement.status}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    No Agreement
                  </span>
                )}
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {delivery.supplierAgreement ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg text-xs border border-slate-200/80">
                    <div>
                      <span className="text-slate-500 block">Agreement No</span>
                      <Link
                        href={`/dashboard/purchasing/agreements`}
                        className="font-mono font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>{delivery.supplierAgreement.agreementNo}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Validity Period</span>
                      <span className="font-medium text-slate-800">
                        {new Date(delivery.supplierAgreement.validFrom).toLocaleDateString()} - {new Date(delivery.supplierAgreement.validTo).toLocaleDateString()}
                      </span>
                    </div>
                    {(delivery.supplierAgreement.loadingSite || delivery.supplierAgreement.offloadingSite) && (
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block">Loading / Quarry Site</span>
                        <span className="font-medium text-slate-800 truncate block" title={delivery.supplierAgreement.loadingSite || delivery.supplierAgreement.offloadingSite || ''}>
                          {delivery.supplierAgreement.loadingSite || delivery.supplierAgreement.offloadingSite}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Highlight for Current Dispatch Item */}
                  {delivery.supplierAgreement.matchedItem && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-amber-600" />
                          Matched Purchase Rate
                        </span>
                        <p className="text-xs font-semibold text-slate-900 mt-0.5">
                          {delivery.supplierAgreement.matchedItem.itemName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold font-mono text-amber-900">
                          {Number(delivery.supplierAgreement.matchedItem.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                        </span>
                        <span className="text-[10px] text-amber-700 block">per {delivery.supplierAgreement.matchedItem.unit || 'm³'}</span>
                      </div>
                    </div>
                  )}

                  {/* All Agreement Items Table */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700">Contracted Items & Prices ({delivery.supplierAgreement.items.length})</span>
                      {delivery.supplierAgreement.totalAmount ? (
                        <span className="text-xs text-slate-500">
                          Contract Value: <strong className="text-slate-800 font-mono">{Number(delivery.supplierAgreement.totalAmount).toLocaleString('en-US')} ETB</strong>
                        </span>
                      ) : null}
                    </div>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-2.5">Item Name</th>
                            <th className="py-2 px-2.5 text-right">Contract Qty</th>
                            <th className="py-2 px-2.5 text-right">Purchase Price (ETB)</th>
                            <th className="py-2 px-2.5 text-right">Total (ETB)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {delivery.supplierAgreement.items.map((it, idx) => (
                            <tr key={idx} className={it.isMatched ? 'bg-amber-50/70 font-medium' : 'hover:bg-slate-50'}>
                              <td className="py-2 px-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span>{it.itemName}</span>
                                  {it.isMatched && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-600 text-white">
                                      Current
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                                {it.qty.toLocaleString('en-US')} {it.unit}
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-900">
                                {it.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                                {it.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No Active Supplier Agreement Found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Pricing defaults to aggregate value ({delivery.aggregateValue.toFixed(2)} ETB/m³).
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
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
            const grossTruckFee = Number(delivery.grossTruckFee || 0);
            const netMatAmount = custReceivable - suppPayable - grossTruckFee;

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
                      <label className="block text-xs font-medium text-indigo-800 mb-1">Net Profit Amount (ETB)</label>
                      <p className={`text-2xl font-bold ${netMatAmount >= 0 ? 'text-indigo-900' : 'text-red-600'}`}>
                        {netMatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-indigo-700 mt-1">Customer Receivable − Supplier Payable − Gross Truck Fee</p>
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
