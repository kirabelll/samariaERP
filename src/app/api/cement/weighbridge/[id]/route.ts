import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET — fetch single weighbridge entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entry = await prisma.cementWeighbridge.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // Resolve lifting info if linked
    let lifting: any = null;
    if (entry.liftingId) {
      try {
        lifting = await prisma.cementLifting.findUnique({
          where: { id: entry.liftingId },
          include: {
            factory: true,
            truck: true,
            customer: true,
            coupon: true,
          },
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      data: {
        ...entry,
        grossWeight: Number(entry.grossWeight),
        tareWeight: Number(entry.tareWeight),
        netWeight: Number(entry.netWeight),
        liftingNo: lifting?.liftingNo || null,
        lifting: lifting ? {
          ...lifting,
          factoryWeight: Number(lifting.factoryWeight),
          buyerWeighbridgeQty: lifting.buyerWeighbridgeQty ? Number(lifting.buyerWeighbridgeQty) : null,
          shortageQty: lifting.shortageQty ? Number(lifting.shortageQty) : null,
        } : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT — update a weighbridge entry
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { weighbridgeType, liftingId, truckPlateNo, grossWeight, tareWeight, operatorName, weighbridgeDate } = body;

    const existing = await prisma.cementWeighbridge.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    }

    const gross = grossWeight !== undefined ? parseFloat(grossWeight) : Number(existing.grossWeight);
    const tare = tareWeight !== undefined ? parseFloat(tareWeight) : Number(existing.tareWeight);
    const net = gross - tare;

    const updated = await prisma.cementWeighbridge.update({
      where: { id: params.id },
      data: {
        ...(weighbridgeType && { weighbridgeType }),
        ...(liftingId !== undefined && { liftingId: liftingId || null }),
        ...(truckPlateNo && { truckPlateNo }),
        ...(grossWeight !== undefined && { grossWeight: gross }),
        ...(tareWeight !== undefined && { tareWeight: tare }),
        netWeight: net,
        ...(operatorName !== undefined && { operatorName }),
        ...(weighbridgeDate && { weighbridgeDate: new Date(weighbridgeDate) }),
      },
    });

    // Recalculate lifting buyer weight if applicable
    const targetLiftingId = updated.liftingId || existing.liftingId;
    if (targetLiftingId) {
      try {
        const buyerEntries = await prisma.cementWeighbridge.findMany({
          where: {
            liftingId: targetLiftingId,
            weighbridgeType: 'BUYER',
            verified: true,
          },
          select: { netWeight: true },
        });

        const totalBuyerWeight = buyerEntries.reduce((sum, e) => {
          const net = Number(e.netWeight);
          return sum + (net > 1000 ? net / 100 : net);
        }, 0);
        const lifting = await prisma.cementLifting.findUnique({
          where: { id: targetLiftingId },
          select: { factoryWeight: true },
        });

        if (lifting) {
          const shortage = Number(lifting.factoryWeight) - totalBuyerWeight;
          await prisma.cementLifting.update({
            where: { id: targetLiftingId },
            data: {
              buyerWeighbridgeQty: totalBuyerWeight > 0 ? totalBuyerWeight : null,
              shortageQty: shortage > 0 ? shortage : 0,
            },
          });
        }
      } catch (err) {
        console.error('[Weighbridge PUT] Failed to recalculate lifting buyer weight:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        grossWeight: Number(updated.grossWeight),
        tareWeight: Number(updated.tareWeight),
        netWeight: Number(updated.netWeight),
      },
      message: 'Weighbridge entry updated successfully',
    });
  } catch (error: any) {
    console.error('[Weighbridge PUT] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH — verify, unverify, or update a weighbridge entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const userId = (session.user as any)?.id || '';
    const userRole = (session.user as any)?.role || '';
    let userName = `${(session.user as any)?.firstName || ''} ${(session.user as any)?.lastName || ''}`.trim();

    if (!userName && session.user?.name) {
      userName = session.user.name;
    }
    if (!userName && userId) {
      try {
        const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, username: true } });
        if (dbUser) {
          userName = `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || dbUser.username || userId;
        }
      } catch {}
    }

    const body = await request.json();
    const { action } = body;

    const entry = await prisma.cementWeighbridge.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    if (action === 'update' || !action) {
      const { weighbridgeType, liftingId, truckPlateNo, grossWeight, tareWeight, operatorName, weighbridgeDate } = body;
      const gross = grossWeight !== undefined ? parseFloat(grossWeight) : Number(entry.grossWeight);
      const tare = tareWeight !== undefined ? parseFloat(tareWeight) : Number(entry.tareWeight);
      const net = gross - tare;

      const updated = await prisma.cementWeighbridge.update({
        where: { id: params.id },
        data: {
          ...(weighbridgeType && { weighbridgeType }),
          ...(liftingId !== undefined && { liftingId: liftingId || null }),
          ...(truckPlateNo && { truckPlateNo }),
          ...(grossWeight !== undefined && { grossWeight: gross }),
          ...(tareWeight !== undefined && { tareWeight: tare }),
          netWeight: net,
          ...(operatorName !== undefined && { operatorName }),
          ...(weighbridgeDate && { weighbridgeDate: new Date(weighbridgeDate) }),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          ...updated,
          grossWeight: Number(updated.grossWeight),
          tareWeight: Number(updated.tareWeight),
          netWeight: Number(updated.netWeight),
        },
        message: 'Updated successfully',
      });
    }

    if (action === 'verify') {
      // Only ADMIN, MANAGER, WAREHOUSE can verify
      const allowedRoles = ['ADMIN', 'MANAGER', 'WAREHOUSE'];
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { success: false, error: `Your role (${userRole}) cannot verify weighbridge entries` },
          { status: 403 }
        );
      }

      if (entry.verified) {
        return NextResponse.json(
          { success: false, error: 'Already verified' },
          { status: 400 }
        );
      }

      const updated = await prisma.cementWeighbridge.update({
        where: { id: params.id },
        data: {
          verified: true,
          verifiedBy: userName || userId,
        },
      });

      // If this is a BUYER weighbridge linked to a lifting, update the lifting's buyerWeighbridgeQty
      if (entry.liftingId && entry.weighbridgeType === 'BUYER') {
        try {
          const buyerEntries = await prisma.cementWeighbridge.findMany({
            where: {
              liftingId: entry.liftingId,
              weighbridgeType: 'BUYER',
              verified: true,
            },
            select: { netWeight: true },
          });

          const totalBuyerWeight = buyerEntries.reduce((sum, e) => {
            const net = Number(e.netWeight);
            return sum + (net > 1000 ? net / 100 : net);
          }, 0);

          const lifting = await prisma.cementLifting.findUnique({
            where: { id: entry.liftingId },
            select: { factoryWeight: true },
          });

          if (lifting) {
            const shortage = Number(lifting.factoryWeight) - totalBuyerWeight;
            await prisma.cementLifting.update({
              where: { id: entry.liftingId },
              data: {
                buyerWeighbridgeQty: totalBuyerWeight > 0 ? totalBuyerWeight : null,
                shortageQty: shortage > 0 ? shortage : 0,
              },
            });
          }
        } catch (err) {
          console.error('[Weighbridge] Failed to update lifting buyer weight:', err);
        }
      }

      return NextResponse.json({
        success: true,
        data: { ...updated, grossWeight: Number(updated.grossWeight), tareWeight: Number(updated.tareWeight), netWeight: Number(updated.netWeight) },
        message: `Verified by ${userName}`,
      });
    }

    if (action === 'unverify') {
      if (!['ADMIN'].includes(userRole)) {
        return NextResponse.json({ success: false, error: 'Only admins can un-verify' }, { status: 403 });
      }

      const updated = await prisma.cementWeighbridge.update({
        where: { id: params.id },
        data: { verified: false, verifiedBy: null },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[Weighbridge PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE — delete a weighbridge entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entry = await prisma.cementWeighbridge.findUnique({
      where: { id: params.id },
    });

    if (!entry) {
      return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    }

    await prisma.cementWeighbridge.delete({
      where: { id: params.id },
    });

    // If this was a BUYER weighbridge linked to a lifting, update the lifting's buyerWeighbridgeQty
    if (entry.liftingId && entry.weighbridgeType === 'BUYER') {
      try {
        const buyerEntries = await prisma.cementWeighbridge.findMany({
          where: {
            liftingId: entry.liftingId,
            weighbridgeType: 'BUYER',
            verified: true,
          },
          select: { netWeight: true },
        });

        const totalBuyerWeight = buyerEntries.reduce((sum, e) => {
          const net = Number(e.netWeight);
          return sum + (net > 1000 ? net / 100 : net);
        }, 0);
        const lifting = await prisma.cementLifting.findUnique({
          where: { id: entry.liftingId },
          select: { factoryWeight: true },
        });

        if (lifting) {
          const shortage = Number(lifting.factoryWeight) - totalBuyerWeight;
          await prisma.cementLifting.update({
            where: { id: entry.liftingId },
            data: {
              buyerWeighbridgeQty: totalBuyerWeight > 0 ? totalBuyerWeight : null,
              shortageQty: shortage > 0 ? shortage : 0,
            },
          });
        }
      } catch (err) {
        console.error('[Weighbridge DELETE] Failed to recalculate lifting buyer weight:', err);
      }
    }

    return NextResponse.json({ success: true, message: 'Weighbridge entry deleted successfully' });
  } catch (error: any) {
    console.error('[Weighbridge DELETE] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
