import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [
      totalTransporters,
      totalTrucks,
      totalAssociations,
      activeAgreements,
      deliveryAgg,
      settlementsAgg,
      recoveriesAgg,
      topTransporters,
      recentSettlements,
      recentRecoveries,
    ] = await Promise.all([
      prisma.transporter.count({ where: { status: 'Active' } }),
      prisma.truck.count({ where: { status: 'Active' } }),
      prisma.transportAssociation.count({ where: { status: 'Active' } }),
      prisma.transporterAgreement.count({ where: { status: 'Active' } }),
      prisma.aggregateDelivery.aggregate({
        _sum: {
          loadedVolume: true,
          deliveredVolume: true,
          shortageVolume: true,
          grossTruckFee: true,
          shortageDeduction: true,
          netTruckPayment: true,
        },
        _count: true,
      }),
      prisma.aggregateSettlement.aggregate({
        _sum: {
          totalGrossFee: true,
          totalShortageDeduction: true,
          finalPayable: true,
        },
        _count: true,
      }),
      prisma.transporterRecovery.aggregate({
        _sum: {
          originalAmount: true,
          recoveredAmount: true,
          pendingAmount: true,
        },
        _count: true,
      }),
      prisma.transporter.findMany({
        take: 5,
        orderBy: { aggDeliveries: { _count: 'desc' } },
        include: {
          association: { select: { name: true } },
          _count: { select: { trucks: true, aggDeliveries: true } },
        },
      }),
      prisma.aggregateSettlement.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { transporter: { select: { companyName: true } } },
      }),
      prisma.transporterRecovery.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { transporter: { select: { companyName: true } } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalTransporters,
          totalTrucks,
          totalAssociations,
          activeAgreements,
          totalTrips: deliveryAgg._count || 0,
          totalVolumeTransported: deliveryAgg._sum.deliveredVolume || deliveryAgg._sum.loadedVolume || 0,
          totalGrossFreight: deliveryAgg._sum.grossTruckFee || 0,
          totalShortageDeductions: deliveryAgg._sum.shortageDeduction || 0,
          totalNetPayable: deliveryAgg._sum.netTruckPayment || 0,
          pendingRecoveries: recoveriesAgg._sum.pendingAmount || 0,
          totalRecovered: recoveriesAgg._sum.recoveredAmount || 0,
        },
        topTransporters: topTransporters.map((t) => ({
          id: t.id,
          name: t.companyName,
          phone: t.phone,
          association: t.association?.name || 'Independent',
          trucksCount: t._count.trucks,
          tripsCount: t._count.aggDeliveries,
          status: t.status,
        })),
        recentSettlements: recentSettlements.map((s) => ({
          id: s.id,
          settlementNo: s.settlementNo,
          transporter: s.transporter?.companyName || '—',
          dispatches: s.totalDispatches,
          finalPayable: s.finalPayable,
          status: s.status,
          date: s.createdAt,
        })),
        recentRecoveries: recentRecoveries.map((r) => ({
          id: r.id,
          recoveryNo: r.recoveryNo,
          transporter: r.transporter?.companyName || '—',
          sourceModule: r.sourceModule,
          originalAmount: r.originalAmount,
          pendingAmount: r.pendingAmount,
          status: r.status,
          date: r.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching transport dashboard stats:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
