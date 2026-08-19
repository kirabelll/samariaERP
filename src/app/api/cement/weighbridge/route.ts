import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const weighbridgeType = searchParams.get('weighbridgeType');
    const truckPlateNo = searchParams.get('truckPlateNo');

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (weighbridgeType) {
      whereClause.weighbridgeType = weighbridgeType;
    }
    if (truckPlateNo) {
      whereClause.truckPlateNo = { contains: truckPlateNo, mode: 'insensitive' };
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

    // Automatically trigger delivery confirmation on linked lifting if weighbridgeType is BUYER
    if (weighbridgeType === 'BUYER' && liftingId) {
      try {
        const lifting = await prisma.cementLifting.findUnique({
          where: { id: liftingId },
          include: { purchase: true, truck: true },
        });

        if (lifting) {
          // Calculate total accumulated buyer weight for this lifting
          const buyerEntries = await prisma.cementWeighbridge.findMany({
            where: {
              liftingId: liftingId,
              weighbridgeType: 'BUYER',
            },
            select: { netWeight: true },
          });

          const totalBuyerWeight = buyerEntries.reduce((sum: number, e: any) => sum + Number(e.netWeight), 0);
          const factoryWeight = Number(lifting.factoryWeight || 0);
          const shortageQty = factoryWeight > totalBuyerWeight ? factoryWeight - totalBuyerWeight : 0;
          const penaltyRate = Number(lifting.purchase?.unitPrice || 0);
          const shortagePenalty = shortageQty > 0 ? shortageQty * penaltyRate : 0;

          // Transition status to Delivered if it was in Lifted status
          const newStatus = lifting.status === 'Lifted' ? 'Delivered' : lifting.status;

          await prisma.cementLifting.update({
            where: { id: liftingId },
            data: {
              status: newStatus,
              buyerWeighbridgeQty: totalBuyerWeight,
              shortageQty,
              ...(shortagePenalty > 0 ? { shortagePenalty } : {}),
            },
          });

          // Auto-create/update shortage penalty record if shortage exists
          if (shortageQty > 0 && penaltyRate > 0) {
            const existingPenalty = await prisma.cementPenalty.findFirst({
              where: { liftingId, penaltyType: 'SHORTAGE' },
            });

            if (!existingPenalty) {
              const penCount = await prisma.cementPenalty.count();
              const penaltyNo = `PEN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(penCount + 1).padStart(4, '0')}`;

              await prisma.cementPenalty.create({
                data: {
                  penaltyNo,
                  liftingId,
                  truckPlateNo: lifting.truck?.plateNo || truckPlateNo || '',
                  penaltyType: 'SHORTAGE',
                  shortageQty,
                  penaltyRate,
                  penaltyAmount: shortagePenalty,
                  recoveryStatus: 'Pending',
                  notes: `Auto-generated from buyer weighbridge creation for lifting ${lifting.liftingNo} | Factory: ${factoryWeight}T, Buyer: ${totalBuyerWeight}T`,
                },
              });
            } else {
              await prisma.cementPenalty.update({
                where: { id: existingPenalty.id },
                data: {
                  shortageQty,
                  penaltyAmount: shortagePenalty,
                  notes: `Updated from buyer weighbridge creation for lifting ${lifting.liftingNo} | Factory: ${factoryWeight}T, Buyer: ${totalBuyerWeight}T`,
                },
              });
            }

            // Auto-log exception for significant shortage (>2%)
            const shortagePercent = factoryWeight > 0 ? (shortageQty / factoryWeight) * 100 : 0;
            if (shortagePercent > 2) {
              const existingLog = await prisma.exceptionLog.findFirst({
                where: { recordId: liftingId, exceptionType: 'SHORTAGE_MISMATCH' },
              });
              if (!existingLog) {
                await prisma.exceptionLog.create({
                  data: {
                    exceptionType: 'SHORTAGE_MISMATCH',
                    severity: shortagePercent > 5 ? 'Critical' : 'High',
                    module: 'CEMENT',
                    recordId: liftingId,
                    recordRef: lifting.liftingNo,
                    description: `Cement shortage ${shortagePercent.toFixed(1)}% (${shortageQty}T) on lifting ${lifting.liftingNo}`,
                    status: 'Open',
                  },
                });
              }
            }
          }

          notify({
            module: 'CEMENT',
            event: 'lifting_delivered',
            details: {
              liftingNo: lifting.liftingNo,
              factoryWeight,
              buyerWeight: totalBuyerWeight,
              shortage: shortageQty,
              message: `Lifting ${lifting.liftingNo} marked as Delivered via Buyer Weighbridge creation. Factory: ${factoryWeight}T, Buyer: ${totalBuyerWeight}T.`,
            },
          });
        }
      } catch (err) {
        console.error('[Weighbridge POST] Failed to process auto delivery confirmation:', err);
      }
    }

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

