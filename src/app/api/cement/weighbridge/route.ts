import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const weighbridgeType = searchParams.get('weighbridgeType');
    const truckPlateNo = searchParams.get('truckPlateNo');
    const liftingId = searchParams.get('liftingId');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (weighbridgeType && weighbridgeType !== 'ALL') {
      whereClause.weighbridgeType = weighbridgeType;
    }
    if (liftingId) {
      try {
        const linkedLifting = await prisma.cementLifting.findUnique({
          where: { id: liftingId },
          select: { id: true, factoryWeighbridgeRef: true },
        });
        if (linkedLifting?.factoryWeighbridgeRef && linkedLifting.factoryWeighbridgeRef.trim()) {
          whereClause.OR = [
            { liftingId: liftingId },
            { weighbridgeNo: { equals: linkedLifting.factoryWeighbridgeRef.trim(), mode: 'insensitive' } },
          ];
        } else {
          whereClause.liftingId = liftingId;
        }
      } catch {
        whereClause.liftingId = liftingId;
      }
    }
    if (truckPlateNo) {
      whereClause.truckPlateNo = { contains: truckPlateNo, mode: 'insensitive' };
    }
    if (search) {
      const searchConditions = [
        { weighbridgeNo: { contains: search, mode: 'insensitive' } },
        { truckPlateNo: { contains: search, mode: 'insensitive' } },
        { operatorName: { contains: search, mode: 'insensitive' } },
      ];
      if (whereClause.OR) {
        whereClause.AND = [
          { OR: whereClause.OR },
          { OR: searchConditions },
        ];
        delete whereClause.OR;
      } else {
        whereClause.OR = searchConditions;
      }
    }

    const [data, total] = await Promise.all([
      prisma.cementWeighbridge.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cementWeighbridge.count({ where: whereClause }),
    ]);

    // Resolve lifting numbers for entries that have a liftingId
    const liftingIds = data.map((e: any) => e.liftingId).filter(Boolean);
    let liftingMap: Record<string, string> = {};
    if (liftingIds.length > 0) {
      try {
        const liftings = await prisma.cementLifting.findMany({
          where: { id: { in: liftingIds } },
          select: { id: true, liftingNo: true },
        });
        liftingMap = Object.fromEntries(liftings.map((l: any) => [l.id, l.liftingNo]));
      } catch {}
    }

    // Ensure numeric fields are properly converted
    const formattedData = data.map((entry: any) => ({
      ...entry,
      grossWeight: Number(entry.grossWeight),
      tareWeight: Number(entry.tareWeight),
      netWeight: Number(entry.netWeight),
      liftingNo: liftingMap[entry.liftingId] || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching weighbridge entries:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { liftingId, weighbridgeType, truckPlateNo, grossWeight, tareWeight, operatorName, proofImage } = body;

    // Validate required fields
    if (!weighbridgeType || !truckPlateNo || grossWeight === undefined || tareWeight === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Auto-generate weighbridgeNo: WB-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const lastEntry = await prisma.cementWeighbridge.findFirst({
      where: { weighbridgeNo: { startsWith: `WB-${dateStr}` } },
      orderBy: { weighbridgeNo: 'desc' },
      select: { weighbridgeNo: true },
    });
    let sequence = '0001';
    if (lastEntry) {
      const lastSeq = parseInt(lastEntry.weighbridgeNo.split('-').pop() || '0');
      sequence = String(lastSeq + 1).padStart(4, '0');
    }
    const weighbridgeNo = `WB-${dateStr}-${sequence}`;

    // Calculate netWeight
    const netWeight = grossWeight - tareWeight;

    const weighbridge = await prisma.cementWeighbridge.create({
      data: {
        weighbridgeNo,
        liftingId: liftingId || null,
        weighbridgeType,
        truckPlateNo,
        grossWeight,
        tareWeight,
        netWeight,
        operatorName: operatorName || null,
        proofImage: proofImage || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: weighbridge,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating weighbridge entry:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
