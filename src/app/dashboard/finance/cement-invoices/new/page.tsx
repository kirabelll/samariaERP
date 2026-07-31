'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardBody, CardHeader, Button } from '@/components/ui';
import { ChevronLeft, Loader, FileText, AlertCircle } from 'lucide-react';

interface LiftingData {
  id: string;
  liftingNo: string;
  purchaseId: string;
  customerId: string;
  factoryWeight: number;
  buyerWeighbridgeQty?: number;
  shortageQty?: number;
  liftingDate: string;
  status: string;
  deliveryNoteNo?: string;
  couponId?: string;
  coupon?: {
    id: string;
    couponNo: string;
    status?: string;
    tonnage?: number;
  };
  purchase?: {
    purchaseNo: string;
    cementType: string;
    unitPrice: number;
    factory?: { name: string };
  };
  factory?: { name: string };
  truck?: { plateNo: string; driverName?: string };
  customer?: {
    id: string;
    companyName: string;
    phone?: string;
    tin?: string;
    withholding?: boolean;
    withholdRate?: number;
    creditLimit?: number;
    creditTermDays?: number;
  };
  invoices?: Array<{
    id: string;
    invoiceNo: string;
    totalAmount: number;
    status: string;
  }>;
}

export default function CreateCementInvoicePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const liftingId = searchParams.get('liftingId') || '';

  const [lifting, setLifting] = useState<LiftingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invoice form state
  const [sellingPrice, setSellingPrice] = useState(0);
  const [sellingPriceSource, setSellingPriceSource] = useState<'agreement' | 'purchase'>('purchase');
  const [vatRate, setVatRate] = useState(15);
  const [applyWithholding, setApplyWithholding] = useState(false);
  const [withholdRate, setWithholdRate] = useState(2);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!liftingId) {
      setError('No lifting ID provided. Go back and select a lifting.');
      setLoading(false);
      return;
    }
    const fetchLifting = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/cement/liftings/${liftingId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setLifting(data.data);
          const purchaseUnitPrice = data.data.purchase?.unitPrice || 0;
          const customerId = data.data.customer?.id;
          const cementType = data.data.purchase?.cementType || '';

          // Try to fetch the customer's active sales agreement for the selling price
          let agreementPrice: number | null = null;
          if (customerId) {
            try {
              const agrRes = await fetch(
                `/api/sales/agreements?customerId=${customerId}&status=Active&limit=1`
              );
              const agrData = await agrRes.json();
              if (agrData.success && agrData.data && agrData.data.length > 0) {
                const agreement = agrData.data[0];
                // Fetch the individual agreement to get enriched items with itemName
                const agrDetailRes = await fetch(`/api/sales/agreements/${agreement.id}`);
                const agrDetailData = await agrDetailRes.json();
                if (agrDetailData.success && agrDetailData.data) {
                  try {
                    const rawItems = agrDetailData.data.items;
                    const items = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
                    if (Array.isArray(items)) {
                      // Find a matching cement item by comparing itemName against the cement type
                      const cementTypeLower = cementType.toLowerCase();
                      const matchingItem = items.find((item: any) => {
                        const itemName = (item.itemName || item.itemCode || '').toLowerCase();
                        return (
                          item.unitPrice &&
                          item.unitPrice > 0 &&
                          (itemName.includes(cementTypeLower) || cementTypeLower.includes(itemName))
                        );
                      });
                      // If no name match, fall back to the first item with a unitPrice (single-item agreements)
                      const fallbackItem = !matchingItem
                        ? items.find((item: any) => item.unitPrice && item.unitPrice > 0)
                        : null;
                      const selectedItem = matchingItem || fallbackItem;
                      if (selectedItem) {
                        agreementPrice = Number(selectedItem.unitPrice);
                      }
                    }
                  } catch {
                    // JSON parse failed — skip agreement price
                  }
                }
              }
            } catch {
              // Agreement fetch failed — fall back to purchase price
            }
          }

          if (agreementPrice && agreementPrice > 0) {
            setSellingPrice(agreementPrice);
            setSellingPriceSource('agreement');
          } else {
            setSellingPrice(purchaseUnitPrice);
            setSellingPriceSource('purchase');
          }

          if (data.data.customer?.withholding) {
            setApplyWithholding(true);
            setWithholdRate(data.data.customer.withholdRate || 2);
          }
          if (data.data.customer?.creditTermDays) {
            const due = new Date();
            due.setDate(due.getDate() + data.data.customer.creditTermDays);
            setDueDate(due.toISOString().split('T')[0]);
          }
        } else {
          setError(data.error || 'Failed to load lifting');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchLifting();
  }, [liftingId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/finance/cement-invoices" className="text-[#007AFF] hover:text-[#0055D4]">
            <ChevronLeft className="w-5 h-5 inline" /> Cement Invoices
          </Link>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-[#007AFF]" />
        </div>
      </div>
    );
  }

  if (error || !lifting) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/finance/cement-invoices" className="text-[#007AFF] hover:text-[#0055D4]">
            <ChevronLeft className="w-5 h-5 inline" /> Cement Invoices
          </Link>
        </div>
        <Card className="rounded-2xl">
          <CardBody className="text-center py-12">
            <p className="text-red-600 text-lg font-medium mb-4">{error || 'Lifting not found'}</p>
            <Link href="/dashboard/finance/cement-invoices">
              <Button variant="primary">Back to Cement Invoices</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  const existingInvoices = lifting.invoices || [];
  const hasInvoice = existingInvoices.length > 0;

  const quantity = Number(lifting.factoryWeight) || 0;
  const subtotal = quantity * sellingPrice;
  const vatAmount = (subtotal * vatRate) / 100;
  const withholdAmount = applyWithholding ? (subtotal * withholdRate) / 100 : 0;
  const totalAmount = subtotal + vatAmount;
  const netReceivable = totalAmount - withholdAmount;

  const handleCreateInvoice = async () => {
    if (!lifting.customer?.id) {
      alert('No customer linked to this lifting');
      return;
    }
    if (sellingPrice <= 0) {
      alert('Please enter a valid selling price');
      return;
    }

    setSaving(true);
    try {
      const items = [
        {
          name: lifting.purchase?.cementType || 'Cement',
          description: `${lifting.purchase?.cementType || 'Cement'} — Lifting ${lifting.liftingNo} from ${lifting.factory?.name || 'Factory'}`,
          qty: quantity,
          unit: 'QT',
          unitPrice: sellingPrice,
          total: subtotal,
        },
      ];

      const res = await fetch('/api/sales/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: lifting.customer.id,
          liftingId: lifting.id,
          division: 'CEMENT',
          items,
          subtotal,
          vatRate,
          vatAmount,
          withholding: withholdAmount,
          totalAmount,
          dueDate: dueDate || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Invoice ${data.data.invoiceNo} created successfully!`);
        router.push('/dashboard/finance/cement-invoices');
      } else {
        alert(data.error || 'Failed to create invoice');
      }
    } catch (err) {
      alert('Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#86868B]">
        <Link href="/dashboard" className="text-[#007AFF] hover:text-[#0055D4]">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/finance/cement-invoices" className="text-[#007AFF] hover:text-[#0055D4]">Cement Invoices</Link>
        <span>/</span>
        <span className="text-[#1D1D1F] font-medium">Create Invoice</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1D1D1F]">Create Cement Invoice</h1>
        <p className="text-[#86868B] mt-2">Generate a sales invoice for cement lifting {lifting.liftingNo}</p>
      </div>

      {/* Warning if already invoiced */}
      {hasInvoice && (
        <Card className="rounded-2xl border-[#FF9500]">
          <CardBody className="flex items-start gap-3 bg-[#FF9500]/5">
            <AlertCircle className="w-5 h-5 text-[#FF9500] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-[#1D1D1F]">This lifting already has {existingInvoices.length} invoice(s)</p>
              <div className="mt-2 space-y-1">
                {existingInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 text-sm">
                    <Link href={`/dashboard/sales/invoices/${inv.id}`} className="text-[#007AFF] hover:text-[#0055D4] font-medium">
                      {inv.invoiceNo}
                    </Link>
                    <span className="text-[#86868B]">ETB {Number(inv.totalAmount).toLocaleString('en-US')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      inv.status === 'Paid' ? 'bg-[#34C759]/10 text-[#248A3D]' :
                      inv.status === 'Partial' ? 'bg-[#FF9500]/10 text-[#D97706]' :
                      'bg-[#FF3B30]/10 text-[#D70015]'
                    }`}>{inv.status}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-[#86868B] mt-2">You can still create another invoice if needed (e.g., partial billing).</p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lifting Summary */}
        <Card className="rounded-2xl">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Lifting Details</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Lifting No</p>
              <Link href={`/dashboard/cement/liftings/${liftingId}`} className="text-sm font-semibold text-[#007AFF]">{lifting.liftingNo}</Link>
            </div>
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Purchase</p>
              <p className="text-sm font-semibold text-[#1D1D1F]">{lifting.purchase?.purchaseNo}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Cement Type</p>
              <p className="text-sm font-semibold text-[#1D1D1F]">{lifting.purchase?.cementType || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Factory</p>
              <p className="text-sm font-semibold text-[#1D1D1F]">{lifting.factory?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Truck</p>
              <p className="text-sm font-semibold text-[#1D1D1F]">{lifting.truck?.plateNo || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Factory Weight</p>
              <p className="text-2xl font-bold text-[#007AFF]">{quantity.toLocaleString('en-US')} QT</p>
            </div>
            {lifting.deliveryNoteNo && (
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Delivery Note</p>
                <p className="text-sm font-semibold text-[#1D1D1F]">{lifting.deliveryNoteNo}</p>
              </div>
            )}
            {lifting.coupon && (
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Coupon</p>
                <p className="text-sm font-semibold text-[#1D1D1F]">
                  {lifting.coupon.couponNo}
                  {lifting.coupon.tonnage ? ` (${lifting.coupon.tonnage} QT)` : ''}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Lifting Date</p>
              <p className="text-sm font-semibold text-[#1D1D1F]">
                {new Date(lifting.liftingDate).toLocaleDateString('en-US', {
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Purchase Unit Price</p>
              <p className="text-sm text-[#86868B]">ETB {Number(lifting.purchase?.unitPrice || 0).toLocaleString('en-US')} (your cost)</p>
            </div>
          </CardBody>
        </Card>

        {/* Invoice Form */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Details
            </h2>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Customer */}
            <div className="bg-[#F5F5F7] rounded-xl p-4">
              <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Customer</p>
              <p className="text-lg font-semibold text-[#1D1D1F]">{lifting.customer?.companyName || '—'}</p>
              <div className="flex gap-4 mt-1 text-sm text-[#86868B]">
                {lifting.customer?.tin && <span>TIN: {lifting.customer.tin}</span>}
                {lifting.customer?.phone && <span>Phone: {lifting.customer.phone}</span>}
              </div>
            </div>

            {/* Item */}
            <div>
              <p className="text-sm font-medium text-[#1D1D1F] mb-3">Invoice Line Item</p>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F5F7]">
                    <tr>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#86868B] uppercase">Item</th>
                      <th className="text-right py-2.5 px-4 text-xs font-semibold text-[#86868B] uppercase">Qty (QT)</th>
                      <th className="text-right py-2.5 px-4 text-xs font-semibold text-[#86868B] uppercase">Selling Price</th>
                      <th className="text-right py-2.5 px-4 text-xs font-semibold text-[#86868B] uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#1D1D1F]">{lifting.purchase?.cementType || 'Cement'}</p>
                        <p className="text-xs text-[#86868B]">Lifting {lifting.liftingNo} — {lifting.factory?.name}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#1D1D1F]">{quantity.toLocaleString('en-US')}</td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={sellingPrice}
                          onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                          className="w-32 text-right rounded-lg border border-gray-300 px-3 py-1.5 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] outline-none"
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#1D1D1F]">ETB {subtotal.toLocaleString('en-US')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#86868B] mt-2">
                {sellingPriceSource === 'agreement'
                  ? 'Selling price from customer agreement. Falls back to purchase unit price if no agreement found.'
                  : 'No active customer agreement found — defaulting to purchase unit price. Adjust to set your actual selling price.'}
              </p>
            </div>

            {/* VAT & Withholding */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1D1D1F] mb-2">VAT Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1D1D1F] mb-2">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="withholding"
                checked={applyWithholding}
                onChange={(e) => setApplyWithholding(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF]"
              />
              <label htmlFor="withholding" className="text-sm text-[#1D1D1F]">Apply withholding tax</label>
              {applyWithholding && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#86868B]">Rate:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={withholdRate}
                    onChange={(e) => setWithholdRate(parseFloat(e.target.value) || 0)}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] outline-none"
                  />
                  <span className="text-sm text-[#86868B]">%</span>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-[#F5F5F7] rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#86868B]">Subtotal</span>
                <span className="font-semibold text-[#1D1D1F]">ETB {subtotal.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#86868B]">VAT ({vatRate}%)</span>
                <span className="font-semibold text-[#1D1D1F]">ETB {vatAmount.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-semibold text-[#1D1D1F]">Total Amount</span>
                <span className="text-xl font-bold text-[#1D1D1F]">ETB {totalAmount.toLocaleString('en-US')}</span>
              </div>
              {applyWithholding && (
                <>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Withholding Tax ({withholdRate}%)</span>
                    <span className="font-semibold">- ETB {withholdAmount.toLocaleString('en-US')}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="font-semibold text-[#34C759]">Net Receivable</span>
                    <span className="text-xl font-bold text-[#34C759]">ETB {netReceivable.toLocaleString('en-US')}</span>
                  </div>
                </>
              )}
            </div>

            {/* Margin */}
            {lifting.purchase?.unitPrice && sellingPrice > 0 && (
              <div className="text-sm text-[#86868B]">
                <span>Margin: </span>
                <span className={`font-semibold ${sellingPrice > lifting.purchase.unitPrice ? 'text-[#34C759]' : sellingPrice < lifting.purchase.unitPrice ? 'text-[#FF3B30]' : 'text-[#86868B]'}`}>
                  ETB {((sellingPrice - lifting.purchase.unitPrice) * quantity).toLocaleString('en-US')}
                </span>
                <span className="ml-1">
                  ({sellingPrice >= lifting.purchase.unitPrice ? '+' : ''}
                  {(((sellingPrice - lifting.purchase.unitPrice) / lifting.purchase.unitPrice) * 100).toFixed(1)}%)
                </span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/dashboard/finance/cement-invoices" className="flex-1">
          <Button variant="outline" size="lg" className="w-full">Cancel</Button>
        </Link>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={handleCreateInvoice}
          disabled={saving || sellingPrice <= 0}
        >
          {saving ? 'Creating Invoice...' : 'Create Invoice'}
        </Button>
      </div>
    </div>
  );
}
