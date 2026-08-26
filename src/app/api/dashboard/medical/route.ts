import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [
      activeCustomers,
      requestsAgg,
      pendingRequestsCount,
      allBatchesCount,
      nearExpiryBatches,
      storeIssuesAgg,
      recentRequests,
      recentStoreIssues,
      commissionAgg,
    ] = await Promise.all([
      prisma.customer.count({
        where: {
          status: 'Active',
          OR: [{ division: 'MEDICAL' }, { licenseNo: { not: null } }],
        },
      }),
      prisma.medicalRequest.aggregate({
        _count: true,
      }),
      prisma.medicalRequest.count({
        where: { status: { in: ['Pending', 'Processing', 'Draft'] } },
      }),
      prisma.medicalBatch.count(),
      prisma.medicalBatch.findMany({
        where: {
          expiryDate: { lte: in90Days },
          quantity: { gt: 0 },
        },
        include: { item: { select: { name: true, unit: true, code: true } } },
        orderBy: { expiryDate: 'asc' },
        take: 10,
      }),
      prisma.medicalStoreIssue.aggregate({
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.medicalRequest.findMany({
        take: 6,
        orderBy: { requestDate: 'desc' },
        include: { customer: { select: { companyName: true } } },
      }),
      prisma.medicalStoreIssue.findMany({
        take: 6,
        orderBy: { issuedDate: 'desc' },
        include: { customer: { select: { companyName: true } } },
      }),
      prisma.commissionCalculation.aggregate({
        where: { status: { in: ['Calculated', 'Approved'] } },
        _sum: { netCommission: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          activeCustomers,
          totalRequests: requestsAgg._count || 0,
          pendingRequests: pendingRequestsCount,
          totalBatches: allBatchesCount,
          nearExpiryCount: nearExpiryBatches.length,
          totalStoreIssues: storeIssuesAgg._count || 0,
          totalStoreIssueValue: storeIssuesAgg._sum.totalAmount || 0,
          pendingCommissions: commissionAgg._sum.netCommission || 0,
        },
        expiryAlerts: nearExpiryBatches.map((b) => {
          const daysLeft = Math.ceil(
            (new Date(b.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            id: b.id,
            batchNo: b.batchNo,
            itemName: b.item?.name || 'Unknown Item',
            itemCode: b.item?.code || '—',
            quantity: b.quantity,
            unit: b.item?.unit || 'Units',
            expiryDate: b.expiryDate,
            warehouse: b.warehouse,
            daysLeft,
            urgency: daysLeft <= 30 ? 'critical' : daysLeft <= 60 ? 'warning' : 'info',
          };
        }),
        recentRequests: recentRequests.map((r) => ({
          id: r.id,
          requestNo: r.requestNo,
          customer: r.customer?.companyName || '—',
          priority: r.priority,
          status: r.status,
          date: r.requestDate,
        })),
        recentStoreIssues: recentStoreIssues.map((issue) => ({
          id: issue.id,
          issueNo: issue.issueNo,
          customer: issue.customer?.companyName || '—',
          totalAmount: issue.totalAmount,
          status: issue.status,
          date: issue.issuedDate,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching medical dashboard stats:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
