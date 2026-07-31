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
      ];
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.factory.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.factory.count({ where: whereClause }),
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
    console.error('Error fetching factories:', error);
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
      factoryType,
      suppliedMaterial,
      location,
      phone,
      contactPerson,
      useCoupons,
      weighbridgeReq,
      terms,
      status,
    } = body;

    if (!name || !factoryType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, factoryType' },
        { status: 400 }
      );
    }

    const count = await prisma.factory.count();
    const code = generateCode('FAC', count + 1);

    const factory = await prisma.factory.create({
      data: {
        code,
        name,
        factoryType,
        suppliedMaterial: suppliedMaterial || null,
        location: location || null,
        phone: phone || null,
        contactPerson: contactPerson || null,
        useCoupons: useCoupons || false,
        weighbridgeReq: weighbridgeReq !== undefined ? weighbridgeReq : true,
        terms: terms || null,
        status: status || 'Active',
      },
    });

    return NextResponse.json(
      { success: true, data: factory },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating factory:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
