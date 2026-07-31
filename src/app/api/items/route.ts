import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const division = searchParams.get('division') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) {
      whereClause.category = category;
    }
    if (status) {
      whereClause.status = status;
    }
    if (division) {
      whereClause.division = division;
    }

    const [data, total] = await Promise.all([
      prisma.item.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.item.count({ where: whereClause }),
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
    console.error('Error fetching items:', error);
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
      nameAmharic,
      category,
      unit,
      itemType,
      division,
      batchTracked,
      expiryTracked,
      manufacturer,
      genericName,
      strength,
      dosageForm,
      status,
    } = body;

    if (!name || !category || !unit) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, category, unit' },
        { status: 400 }
      );
    }

    // Generate item code
    const count = await prisma.item.count();
    const code = `ITEM-${String(count + 1).padStart(5, '0')}`;

    const item = await prisma.item.create({
      data: {
        code,
        name,
        nameAmharic: nameAmharic || null,
        category,
        unit,
        itemType: itemType || 'sales',
        division: division || 'CONSTRUCTION',
        batchTracked: batchTracked || false,
        expiryTracked: expiryTracked || false,
        manufacturer: manufacturer || null,
        genericName: genericName || null,
        strength: strength || null,
        dosageForm: dosageForm || null,
        status: status || 'Active',
      },
    });

    return NextResponse.json(
      { success: true, data: item },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
