import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [
      aggregateAgg,
      aggregateCounts,
      recentAggregateDeliveries,
      cementPurchasesAgg,
      cementLiftingsAgg,
      couponCounts,
      recentCementLiftings,
      factoryBalances,
      penaltiesAgg,
    ] = await Promise.all([
      prisma.aggregateDelivery.aggregate({
        _sum: {
          loadedVolume: true,
          deliveredVolume: true,
          shortageVolume: true,
          grossTruckFee: true,
          shortageDeduction: true,
          netTruckPayment: true,
          aggregateValue: true,
        },
        _count: true,
      }),
      Promise.all([
        prisma.aggregateDelivery.count({ where: { status: 'Dispatched' } }),
        prisma.aggregateDelivery.count({ where: { status: 'Delivered' } }),
        prisma.aggregateDelivery.count({ where: { status: 'Verified' } }),
        prisma.aggregateDelivery.count({ where: { status: 'Settled' } }),
      ]),
      prisma.aggregateDelivery.findMany({
        take: 6,
        orderBy: { dispatchDate: 'desc' },
        include: {
          transporter: { select: { companyName: true } },
          truck: { select: { plateNo: true } },
          proofs: { take: 1 },
        },
      }),
      prisma.cementPurchase.aggregate({
        _sum: {
          quantityTons: true,
          totalAmount: true,
          paidAmount: true,
          balanceRemaining: true,
        },
        _count: true,
      }),
      prisma.cementLifting.aggregate({
        _sum: {
          factoryWeight: true,
          buyerWeighbridgeQty: true,
        },
        _count: true,
      }),
      Promise.all([
        prisma.coupon.count(),
        prisma.coupon.count({ where: { status: 'USED' } }),
        prisma.coupon.count({ where: { status: 'COLLECTED' } }),
      ]),
      prisma.cementLifting.findMany({
        take: 6,
        orderBy: { liftingDate: 'desc' },
        include: {
          customer: { select: { companyName: true } },
          factory: { select: { name: true } },
          truck: { select: { plateNo: true } },
        },
      }),
      prisma.cementBalance.findMany({
        take: 5,
        include: { factory: { select: { name: true } } },
        orderBy: { remainingQty: 'desc' },
      }),
      prisma.cementPenalty.aggregate({
        _sum: { penaltyAmount: true, recoveredAmount: true },
        _count: true,
      }),
    ]);

    const [dispatchedCount, deliveredCount, verifiedCount, settledCount] = aggregateCounts;
    const [totalCoupons, usedCoupons, activeCoupons] = couponCounts;

    return NextResponse.json({
      success: true,
      data: {
        aggregate: {
          totalLoadedVolume: aggregateAgg._sum.loadedVolume || 0,
          totalDeliveredVolume: aggregateAgg._sum.deliveredVolume || 0,
          totalShortageVolume: aggregateAgg._sum.shortageVolume || 0,
          totalGrossTruckFee: aggregateAgg._sum.grossTruckFee || 0,
          totalShortageDeduction: aggregateAgg._sum.shortageDeduction || 0,
          totalNetTruckPayment: aggregateAgg._sum.netTruckPayment || 0,
          totalDispatches: aggregateAgg._count || 0,
          statusCounts: {
            dispatched: dispatchedCount,
            delivered: deliveredCount,
            verified: verifiedCount,
            settled: settledCount,
          },
          recentDeliveries: recentAggregateDeliveries.map((d) => ({
            id: d.id,
            dispatchNo: d.dispatchNo,
            transporter: d.transporter?.companyName || '—',
            plateNo: d.truck?.plateNo || '—',
            loadedVolume: d.loadedVolume,
            deliveredVolume: d.deliveredVolume,
            shortageVolume: d.shortageVolume,
            status: d.status,
            date: d.dispatchDate,
            hasProof: d.proofs && d.proofs.length > 0,
          })),
        },
        cement: {
          totalPurchasedTons: cementPurchasesAgg._sum.quantityTons || 0,
          totalPurchaseSpend: cementPurchasesAgg._sum.totalAmount || 0,
          totalLiftedTons: cementLiftingsAgg._sum.factoryWeight || 0,
          totalBuyerWeight: cementLiftingsAgg._sum.buyerWeighbridgeQty || 0,
          totalLiftingsCount: cementLiftingsAgg._count || 0,
          coupons: {
            total: totalCoupons,
            used: usedCoupons,
            active: activeCoupons,
          },
          factoryBalances: factoryBalances.map((b) => ({
            id: b.id,
            factoryName: b.factory?.name || 'Factory',
            initialQty: b.initialQty,
            liftedQty: b.liftedQty,
            remainingQty: b.remainingQty,
          })),
          recentLiftings: recentCementLiftings.map((l) => ({
            id: l.id,
            liftingNo: l.liftingNo,
            customer: l.customer?.companyName || '—',
            factory: l.factory?.name || '—',
            plateNo: l.truck?.plateNo || '—',
            factoryWeight: l.factoryWeight,
            buyerWeight: l.buyerWeighbridgeQty,
            status: l.status,
            date: l.liftingDate,
          })),
          penalties: {
            totalAmount: penaltiesAgg._sum.penaltyAmount || 0,
            recoveredAmount: penaltiesAgg._sum.recoveredAmount || 0,
            count: penaltiesAgg._count || 0,
          },
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching construction dashboard stats:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
