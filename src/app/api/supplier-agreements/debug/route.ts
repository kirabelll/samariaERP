import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get all supplier agreements without any filters to debug
    const allAgreements = await prisma.supplierAgreement.findMany({
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
    });

    // Get count by status
    const statusCounts = await prisma.supplierAgreement.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    return NextResponse.json({
      success: true,
      debug: {
        totalAgreements: allAgreements.length,
        statusBreakdown: statusCounts.map(s => ({ status: s.status, count: s._count.status })),
        allAgreements: allAgreements.map(a => ({
          id: a.id,
          agreementNo: a.agreementNo,
          status: a.status,
          supplierName: a.supplier?.companyName || 'No Supplier',
          division: a.division,
          totalAmount: a.totalAmount,
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}