import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const division = searchParams.get('division') || '';
    const customerId = searchParams.get('customerId') || '';
    const includeVoid = searchParams.get('includeVoid') === 'true';

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { agreementNo: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    } else if (includeVoid === false || searchParams.get('includeVoid') === 'false') {
      // Explicitly exclude Void agreements
      whereClause.status = { not: 'Void' };
    }
    // If includeVoid is true or not specified, show all records including void
    if (division) {
      whereClause.division = division;
    }
    if (customerId) {
      whereClause.customerId = customerId;
    }

    const [data, total] = await Promise.all([
      prisma.salesAgreement.findMany({
        where: whereClause,
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salesAgreement.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      total,
      message: `Retrieved all ${total} sales agreements`,
    });
  } catch (error: any) {
    console.error('Error fetching all sales agreements:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}