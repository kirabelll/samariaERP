import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const supplierId = searchParams.get('supplierId') || '';
    const division = searchParams.get('division') || '';
    const includeVoid = searchParams.get('includeVoid') === 'true';

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { agreementNo: { contains: search, mode: 'insensitive' } },
        { supplier: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    } else if (includeVoid === false || searchParams.get('includeVoid') === 'false') {
      // Explicitly exclude Void agreements
      whereClause.status = { not: 'Void' };
    }
    // If includeVoid is true or not specified, show all records including void
    if (supplierId) {
      whereClause.supplierId = supplierId;
    }
    if (division) {
      whereClause.division = division;
    }

    const [data, total] = await Promise.all([
      prisma.supplierAgreement.findMany({
        where: whereClause,
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplierAgreement.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      total,
      message: `Retrieved all ${total} supplier agreements`,
    });
  } catch (error: any) {
    console.error('Error fetching all supplier agreements:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}