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

    const andClauses: any[] = [];

    if (search) {
      andClauses.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { genericName: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (category) {
      andClauses.push({ category });
    }

    if (status) {
      andClauses.push({ status });
    }

    if (division && division !== 'ALL') {
      if (division === 'MEDICAL') {
        andClauses.push({
          OR: [
            { division: 'MEDICAL' },
            { division: 'BOTH' },
            { division: 'GENERAL' },
            { category: { contains: 'Med', mode: 'insensitive' } },
            { category: { contains: 'Pharma', mode: 'insensitive' } },
            { category: { contains: 'Drug', mode: 'insensitive' } },
          ],
        });
      } else {
        andClauses.push({
          OR: [
            { division: division },
            { division: 'BOTH' },
            { division: 'GENERAL' },
          ],
        });
      }
    }

    const whereClause = andClauses.length > 0 ? { AND: andClauses } : {};

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

    // Generate unique item code safely
    let code = body.code;
    if (code) {
      const existing = await prisma.item.findUnique({ where: { code } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Item code "${code}" already exists.` },
          { status: 400 }
        );
      }
    } else {
      const lastItem = await prisma.item.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { code: true },
      });

      let nextNumber = 1;
      if (lastItem?.code) {
        const match = lastItem.code.match(/ITEM-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      code = `ITEM-${String(nextNumber).padStart(5, '0')}`;
      let exists = await prisma.item.findUnique({ where: { code } });
      while (exists) {
        nextNumber++;
        code = `ITEM-${String(nextNumber).padStart(5, '0')}`;
        exists = await prisma.item.findUnique({ where: { code } });
      }
    }

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
