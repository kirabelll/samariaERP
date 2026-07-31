import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCustomerCode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const division = searchParams.get('division') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (division) {
      whereClause.division = division;
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where: whereClause }),
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
    console.error('Error fetching customers:', error);
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
      customerType,
      companyName,
      firstName,
      lastName,
      tin,
      phone,
      email,
      contactPerson,
      division,
      status,
      creditLimit,
      creditTermDays,
      withholding,
      withholdRate,
    } = body;

    if (!customerType || !companyName || !phone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerType, companyName, phone' },
        { status: 400 }
      );
    }

    const count = await prisma.customer.count();
    const code = generateCustomerCode(count + 1);

    const customer = await prisma.customer.create({
      data: {
        code,
        customerType,
        companyName,
        firstName: firstName || null,
        lastName: lastName || null,
        tin: tin || null,
        phone,
        email: email || null,
        contactPerson: contactPerson || null,
        division: division || 'CONSTRUCTION',
        status: status || 'Active',
        creditLimit: creditLimit || 0,
        creditTermDays: creditTermDays || 0,
        withholding: withholding || false,
        withholdRate: withholdRate || 2,
      },
    });

    return NextResponse.json(
      { success: true, data: customer },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
