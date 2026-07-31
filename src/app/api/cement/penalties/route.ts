import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const penaltyType = searchParams.get('penaltyType');
    const recoveryStatus = searchParams.get('recoveryStatus');
    const transporterId = searchParams.get('transporterId');

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (penaltyType) {
      whereClause.penaltyType = penaltyType;
    }
    if (recoveryStatus) {
      whereClause.recoveryStatus = recoveryStatus;
    }
    if (transporterId) {
      whereClause.transporterId = transporterId;
    }

    const [data, total] = await Promise.all([
      prisma.cementPenalty.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cementPenalty.count({ where: whereClause }),
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
    console.error('Error fetching cement penalties:', error);
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
      liftingId,
      transporterId,
      truckPlateNo,
      penaltyType,
      shortageQty = 0,
      penaltyRate = 0,
      penaltyAmount = 0,
      approvedBy,
      notes,
    } = body;

    // Validate required fields
    if (!penaltyType) {
      return NextResponse.json(
        { success: false, error: 'penaltyType is required' },
        { status: 400 }
      );
    }

    // Auto-generate penaltyNo: PEN-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.cementPenalty.count();
    const sequence = String(count + 1).padStart(4, '0');
    const penaltyNo = `PEN-${dateStr}-${sequence}`;

    const penalty = await prisma.cementPenalty.create({
      data: {
        penaltyNo,
        liftingId: liftingId || null,
        transporterId: transporterId || null,
        truckPlateNo: truckPlateNo || null,
        penaltyType,
        shortageQty,
        penaltyRate,
        penaltyAmount,
        approvedBy: approvedBy || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: penalty,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating cement penalty:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
