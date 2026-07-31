import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.transportAssociation.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          transporters: {
            select: {
              id: true,
              code: true,
              companyName: true,
            },
          },
        },
      }),
      prisma.transportAssociation.count({ where: whereClause }),
    ]);

    // Add transporter count to each association
    const dataWithCounts = data.map((assoc) => ({
      ...assoc,
      transporterCount: assoc.transporters.length,
    }));

    return NextResponse.json({
      success: true,
      data: dataWithCounts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching transport associations:', error);
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
      name,
      contactPerson,
      phone,
      email,
      address,
      status,
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const count = await prisma.transportAssociation.count();
    const code = generateCode('TA', count + 1);

    const association = await prisma.transportAssociation.create({
      data: {
        code,
        name,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        status: status || 'Active',
      },
    });

    return NextResponse.json(
      { success: true, data: association },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating transport association:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
