import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const division = searchParams.get('division') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { proformaNo: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }
    if (division) {
      whereClause.division = division;
    }

    const [data, total] = await Promise.all([
      prisma.proforma.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.proforma.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching proformas:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      division,
      items,
      subtotal,
      vatAmount,
      withholding,
      totalAmount,
      validityDays,
      terms,
      status,
      createdBy,
    } = body;

    if (!customerId || !items || !totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerId, items, totalAmount' },
        { status: 400 }
      );
    }

    // Validate division against Prisma enum
    const validDivisions = ['CONSTRUCTION', 'MEDICAL', 'CEMENT', 'AGGREGATE', 'GENERAL', 'BOTH'];
    const safeDivision = validDivisions.includes(division) ? division : 'CONSTRUCTION';

    // Generate proforma number
    const count = await prisma.proforma.count();
    const proformaNo = `PRF-${String(count + 1).padStart(7, '0')}`;

    const proforma = await prisma.proforma.create({
      data: {
        proformaNo,
        customerId,
        division: safeDivision,
        items: JSON.stringify(items),
        subtotal: subtotal || 0,
        vatAmount: vatAmount || 0,
        withholding: withholding || 0,
        totalAmount,
        validityDays: validityDays || 15,
        terms: terms || null,
        status: status || 'Draft',
        createdBy: createdBy || null,
      },
      include: { customer: true },
    });

    return NextResponse.json(
      { success: true, data: proforma },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating proforma:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
