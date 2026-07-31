import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const factoryId = searchParams.get('factoryId');

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (factoryId) {
      whereClause.factoryId = factoryId;
    }

    const [data, total] = await Promise.all([
      prisma.cementBalance.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          purchase: {
            select: {
              purchaseNo: true,
              cementType: true,
              unitPrice: true,
              status: true,
            },
          },
          factory: true,
        },
        orderBy: { lastUpdated: 'desc' },
      }),
      prisma.cementBalance.count({ where: whereClause }),
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
    console.error('Error fetching cement balances:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { purchaseId, factoryId, initialQty, liftedQty = 0 } = body;

    // Validate required fields
    if (!purchaseId || !factoryId || initialQty === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const remainingQty = initialQty - liftedQty;

    // Try to find existing balance
    const existing = await prisma.cementBalance.findUnique({
      where: {
        purchaseId_factoryId: {
          purchaseId,
          factoryId,
        },
      },
    });

    let balance;
    if (existing) {
      // Update existing
      balance = await prisma.cementBalance.update({
        where: { id: existing.id },
        data: {
          initialQty,
          liftedQty,
          remainingQty,
          lastUpdated: new Date(),
        },
      });
    } else {
      // Create new
      balance = await prisma.cementBalance.create({
        data: {
          purchaseId,
          factoryId,
          initialQty,
          liftedQty,
          remainingQty,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: balance,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating/updating cement balance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
