import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [
      purchaseOrdersAgg,
      pendingPaymentsAgg,
      paidPaymentsAgg,
      activeAgreementsCount,
      totalSuppliersCount,
      grvCounts,
      recentPurchaseOrders,
      recentGrvs,
      recentPayments,
      transporterRecoveriesAgg,
      topSuppliers,
    ] = await Promise.all([
      prisma.purchaseOrder.aggregate({
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.supplierPayment.aggregate({
        where: { status: { in: ['Pending', 'Approved'] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.supplierPayment.aggregate({
        where: { status: 'Paid' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.supplierAgreement.count({ where: { status: 'Active' } }),
      prisma.supplier.count({ where: { status: 'Active' } }),
      Promise.all([
        prisma.goodsReceive.count(),
        prisma.goodsReceive.count({ where: { status: 'Received' } }),
      ]),
      prisma.purchaseOrder.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { supplier: { select: { companyName: true } } },
      }),
      prisma.goodsReceive.findMany({
        take: 6,
        orderBy: { receivedDate: 'desc' },
        include: { supplier: { select: { companyName: true } } },
      }),
      prisma.supplierPayment.findMany({
        take: 6,
        orderBy: { paymentDate: 'desc' },
        include: { supplier: { select: { companyName: true } } },
      }),
      prisma.transporterRecovery.aggregate({
        where: { status: { in: ['Open', 'Partial'] } },
        _sum: { pendingAmount: true, originalAmount: true },
      }),
      prisma.supplier.findMany({
        take: 5,
        orderBy: { purchaseOrders: { _count: 'desc' } },
        include: {
          _count: { select: { purchaseOrders: true, goodsReceives: true } },
        },
      }),
    ]);

    const [totalGrvs, receivedGrvs] = grvCounts;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProcurementSpend: purchaseOrdersAgg._sum.totalAmount || 0,
          totalPurchaseOrders: purchaseOrdersAgg._count || 0,
          pendingPaymentsAmount: pendingPaymentsAgg._sum.amount || 0,
          paidPaymentsAmount: paidPaymentsAgg._sum.amount || 0,
          activeAgreements: activeAgreementsCount,
          totalSuppliers: totalSuppliersCount,
          totalGrvs,
          receivedGrvs,
          unrecoveredTransport: transporterRecoveriesAgg._sum.pendingAmount || 0,
        },
        topSuppliers: topSuppliers.map((s) => ({
          id: s.id,
          name: s.companyName,
          phone: s.phone,
          category: s.category || 'General',
          poCount: s._count.purchaseOrders,
          grvCount: s._count.goodsReceives,
          status: s.status,
        })),
        recentPurchaseOrders: recentPurchaseOrders.map((po) => ({
          id: po.id,
          poNo: po.poNo,
          supplier: po.supplier?.companyName || '—',
          totalAmount: po.totalAmount,
          status: po.status,
          date: po.createdAt,
        })),
        recentGrvs: recentGrvs.map((grv) => ({
          id: grv.id,
          grvNo: grv.grvNo,
          supplier: grv.supplier?.companyName || '—',
          totalAmount: grv.totalAmount,
          status: grv.status,
          date: grv.receivedDate,
        })),
        recentPayments: recentPayments.map((p) => ({
          id: p.id,
          paymentNo: p.paymentNo,
          supplier: p.supplier?.companyName || '—',
          amount: p.amount,
          method: p.paymentMethod,
          status: p.status,
          date: p.paymentDate,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching purchasing dashboard stats:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
