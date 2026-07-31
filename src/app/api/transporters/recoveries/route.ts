import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const transporterId = searchParams.get('transporterId');
    const status = searchParams.get('status');
    const sourceModule = searchParams.get('sourceModule');

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (transporterId) {
      whereClause.transporterId = transporterId;
    }
    if (status) {
      whereClause.status = status;
    }
    if (sourceModule) {
      whereClause.sourceModule = sourceModule;
    }

    const [data, total] = await Promise.all([
      prisma.transporterRecovery.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          transporter: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transporterRecovery.count({ where: whereClause }),
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
    console.error('Error fetching transporter recoveries:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transporterId, sourceModule, sourceId, originalAmount, notes } = body;

    // Validate required fields
    if (!transporterId || !sourceModule || originalAmount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Auto-generate recoveryNo: REC-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.transporterRecovery.count();
    const sequence = String(count + 1).padStart(4, '0');
    const recoveryNo = `REC-${dateStr}-${sequence}`;

    // Set pendingAmount = originalAmount
    const pendingAmount = originalAmount;

    const recovery = await prisma.transporterRecovery.create({
      data: {
        recoveryNo,
        transporterId,
        sourceModule,
        sourceId: sourceId || null,
        originalAmount,
        pendingAmount,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: recovery,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating transporter recovery:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
