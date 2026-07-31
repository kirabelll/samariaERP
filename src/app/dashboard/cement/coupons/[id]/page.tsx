'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardBody, CardHeader, Badge, Button } from '@/components/ui';
import { ChevronLeft, Loader, Factory, FileText, Truck, Weight, Calendar, User, Tag } from 'lucide-react';

interface CouponDetail {
  id: string;
  couponNo: string;
  factoryId: string;
  purchaseId: string;
  purchaseOrderId?: string;
  tonnage?: number;
  status: string;
  collectedDate?: string;
  collectedBy?: string;
  handedOverTo?: string;
  handoverDate?: string;
  handoverProof?: string;
  usedDate?: string;
  returnDate?: string;
  notes?: string;
  createdAt: string;
  factory?: { id: string; name: string; code?: string };
  purchase?: {
    id: string;
    purchaseNo: string;
    cementType?: string;
    quantityTons?: number;
    unitPrice?: number;
    totalAmount?: number;
    status?: string;
    factory?: { name: string };
  };
  purchaseOrder?: { id: string; poNo: string };
  liftings?: Array<{
    id: string;
    liftingNo: string;
    factoryWeight: number;
    liftingDate: string;
    status: string;
    truck?: { plateNo: string; driverName?: string };
    factory?: { name: string };
  }>;
}

export default function CouponDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [coupon, setCoupon] = useState<CouponDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchCoupon = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/cement/coupons/${id}`);
        const data = await res.json();
        if (data.success && data.data) {
          setCoupon(data.data);
        } else {
          setError(data.error || 'Failed to load coupon');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchCoupon();
  }, [id]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'COLLECTED':
      case 'IN_CUSTODY':
        return 'bg-[#FF9500]/10 text-[#D97706]';
      case 'HANDED_OVER':
        return 'bg-[#007AFF]/10 text-[#0055D4]';
      case 'USED':
        return 'bg-[#34C759]/10 text-[#248A3D]';
      case 'RETURNED':
        return 'bg-[#AF52DE]/10 text-[#8944AB]';
      case 'CANCELLED':
        return 'bg-[#FF3B30]/10 text-[#D70015]';
      default:
        return 'bg-[#007AFF]/10 text-[#0055D4]';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'COLLECTED': return 'Collected';
      case 'IN_CUSTODY': return 'In Custody';
      case 'HANDED_OVER': return 'Handed Over';
      case 'USED': return 'Used';
      case 'RETURNED': return 'Returned';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/cement/coupons" className="text-[#007AFF] hover:text-[#0055D4]">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Link href="/dashboard/cement/coupons" className="text-[#007AFF] hover:text-[#0055D4]">
            Coupon Management
          </Link>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto text-[#007AFF] mb-4" />
            <p className="text-[#86868B]">Loading coupon details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !coupon) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/cement/coupons" className="text-[#007AFF] hover:text-[#0055D4]">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Link href="/dashboard/cement/coupons" className="text-[#007AFF] hover:text-[#0055D4]">
            Coupon Management
          </Link>
        </div>
        <Card className="rounded-2xl">
          <CardBody className="text-center py-12">
            <p className="text-red-600 text-lg font-medium mb-4">{error || 'Coupon not found'}</p>
            <Link href="/dashboard/cement/coupons">
              <Button variant="primary">Back to Coupons</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#86868B]">
        <Link href="/dashboard" className="text-[#007AFF] hover:text-[#0055D4]">Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/cement" className="text-[#007AFF] hover:text-[#0055D4]">Cement</Link>
        <span>/</span>
        <Link href="/dashboard/cement/coupons" className="text-[#007AFF] hover:text-[#0055D4]">Coupons</Link>
        <span>/</span>
        <span className="text-[#1D1D1F] font-medium">{coupon.couponNo}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1D1D1F]">{coupon.couponNo}</h1>
          <p className="text-[#86868B] mt-2">Cement coupon detail and tracking information</p>
        </div>
        <Badge status={coupon.status as any} className={`text-base px-3 py-1 ${statusColor(coupon.status)}`}>
          {statusLabel(coupon.status)}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coupon Information */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Coupon Information</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Coupon Number</p>
                <p className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#86868B]" />
                  {coupon.couponNo}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Factory</p>
                <p className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <Factory className="w-4 h-4 text-[#86868B]" />
                  {coupon.factory?.name || '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Cement Purchase</p>
                <Link
                  href={`/dashboard/cement/purchases/${coupon.purchaseId}`}
                  className="text-[#007AFF] hover:text-[#0055D4] font-semibold text-lg"
                >
                  {coupon.purchase?.purchaseNo || '—'}
                </Link>
                {coupon.purchase?.cementType && (
                  <p className="text-sm text-[#86868B] mt-1">{coupon.purchase.cementType}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Tonnage</p>
                <p className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <Weight className="w-4 h-4 text-[#86868B]" />
                  {coupon.tonnage ? `${Number(coupon.tonnage).toLocaleString('en-US')} QT` : '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Collected Date</p>
                <p className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#86868B]" />
                  {formatDate(coupon.collectedDate)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Collected By</p>
                <p className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#86868B]" />
                  {coupon.collectedBy || '—'}
                </p>
              </div>
            </div>

            {coupon.purchaseOrder && (
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Purchase Order</p>
                <p className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#86868B]" />
                  {coupon.purchaseOrder.poNo}
                </p>
              </div>
            )}

            {coupon.notes && (
              <div>
                <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-[#1D1D1F] bg-[#F5F5F7] rounded-lg p-3">{coupon.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Status & Handover */}
        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#1D1D1F]">Status Timeline</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Collected */}
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-[#34C759] mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#1D1D1F]">Collected</p>
                  <p className="text-xs text-[#86868B]">{formatDate(coupon.collectedDate)}</p>
                  {coupon.collectedBy && <p className="text-xs text-[#86868B]">By: {coupon.collectedBy}</p>}
                </div>
              </div>

              {/* Handed Over */}
              {(coupon.status === 'HANDED_OVER' || coupon.status === 'USED') && (
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#007AFF] mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#1D1D1F]">Handed Over</p>
                    <p className="text-xs text-[#86868B]">{formatDate(coupon.handoverDate)}</p>
                    {coupon.handedOverTo && <p className="text-xs text-[#86868B]">To: {coupon.handedOverTo}</p>}
                  </div>
                </div>
              )}

              {/* Used */}
              {coupon.status === 'USED' && (
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#34C759] mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#1D1D1F]">Used</p>
                    <p className="text-xs text-[#86868B]">{formatDate(coupon.usedDate)}</p>
                  </div>
                </div>
              )}

              {/* Returned */}
              {coupon.status === 'RETURNED' && (
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#AF52DE] mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#1D1D1F]">Returned</p>
                    <p className="text-xs text-[#86868B]">{formatDate(coupon.returnDate)}</p>
                  </div>
                </div>
              )}

              {/* Cancelled */}
              {coupon.status === 'CANCELLED' && (
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#FF3B30] mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#1D1D1F]">Cancelled</p>
                  </div>
                </div>
              )}

              {/* Pending steps */}
              {(coupon.status === 'COLLECTED' || coupon.status === 'IN_CUSTODY') && (
                <>
                  <div className="flex items-start gap-3 opacity-40">
                    <div className="w-3 h-3 rounded-full border-2 border-[#86868B] mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#86868B]">Handover</p>
                      <p className="text-xs text-[#86868B]">Pending</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 opacity-40">
                    <div className="w-3 h-3 rounded-full border-2 border-[#86868B] mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#86868B]">Used</p>
                      <p className="text-xs text-[#86868B]">Pending</p>
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {/* Purchase Info */}
          {coupon.purchase && (
            <Card className="rounded-2xl">
              <CardHeader>
                <h3 className="text-lg font-semibold text-[#1D1D1F]">Purchase Details</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Purchase No</p>
                  <Link
                    href={`/dashboard/cement/purchases/${coupon.purchaseId}`}
                    className="text-sm font-semibold text-[#007AFF] hover:text-[#0055D4]"
                  >
                    {coupon.purchase.purchaseNo}
                  </Link>
                </div>
                {coupon.purchase.cementType && (
                  <div>
                    <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Cement Type</p>
                    <p className="text-sm font-semibold text-[#1D1D1F]">{coupon.purchase.cementType}</p>
                  </div>
                )}
                {coupon.purchase.quantityTons && (
                  <div>
                    <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Purchase Qty</p>
                    <p className="text-sm font-semibold text-[#1D1D1F]">{Number(coupon.purchase.quantityTons).toLocaleString('en-US')} QT</p>
                  </div>
                )}
                {coupon.purchase.status && (
                  <div>
                    <p className="text-xs font-medium text-[#86868B] uppercase tracking-wider mb-1">Purchase Status</p>
                    <p className="text-sm font-semibold text-[#1D1D1F]">{coupon.purchase.status}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Created */}
          <Card className="rounded-2xl">
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#1D1D1F]">Created</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-[#1D1D1F]">{formatDate(coupon.createdAt)}</p>
              <p className="text-xs text-[#86868B] mt-1">
                {new Date(coupon.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Linked Liftings */}
      {coupon.liftings && coupon.liftings.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Linked Liftings ({coupon.liftings.length})
            </h2>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[#86868B] uppercase">Lifting No</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[#86868B] uppercase">Truck</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[#86868B] uppercase">Factory Weight</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[#86868B] uppercase">Date</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[#86868B] uppercase">Status</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[#86868B] uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {coupon.liftings.map((lifting) => (
                    <tr key={lifting.id} className="border-b last:border-0">
                      <td className="py-3 px-3 font-medium text-[#1D1D1F]">{lifting.liftingNo}</td>
                      <td className="py-3 px-3 text-[#1D1D1F]">
                        {lifting.truck?.plateNo || '—'}
                        {lifting.truck?.driverName && (
                          <span className="text-xs text-[#86868B] ml-1">({lifting.truck.driverName})</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#007AFF]">
                        {Number(lifting.factoryWeight).toLocaleString('en-US')} QT
                      </td>
                      <td className="py-3 px-3 text-[#1D1D1F]">{formatDate(lifting.liftingDate)}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${
                          lifting.status === 'Delivered' ? 'bg-[#34C759]/10 text-[#248A3D]' :
                          lifting.status === 'Verified' ? 'bg-[#007AFF]/10 text-[#0055D4]' :
                          lifting.status === 'Lifted' ? 'bg-[#FF9500]/10 text-[#D97706]' :
                          'bg-[#FF3B30]/10 text-[#D70015]'
                        }`}>
                          {lifting.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          href={`/dashboard/cement/liftings/${lifting.id}`}
                          className="text-[#007AFF] hover:text-[#0055D4] text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/dashboard/cement/coupons" className="flex-1">
          <Button variant="outline" size="lg" className="w-full">Back to Coupons</Button>
        </Link>
        <Link href={`/dashboard/cement/purchases/${coupon.purchaseId}`} className="flex-1">
          <Button variant="primary" size="lg" className="w-full">View Purchase</Button>
        </Link>
      </div>
    </div>
  );
}
