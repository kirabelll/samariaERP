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
    let liftingInfo = null;
    if (entry.liftingId) {
      try {
        liftingInfo = await prisma.cementLifting.findUnique({
          where: { id: entry.liftingId },
          select: { liftingNo: true, factoryWeight: true, status: true },
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
        liftingNo: liftingInfo?.liftingNo || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH — verify or update a weighbridge entry
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

    // Fallback: if name not in session, use session.user.name or look up from DB
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
          // Sum all verified BUYER weighbridge net weights for this lifting
          const buyerEntries = await prisma.cementWeighbridge.findMany({
            where: {
              liftingId: entry.liftingId,
              weighbridgeType: 'BUYER',
              verified: true,
            },
            select: { netWeight: true },
          });

          const totalBuyerWeight = buyerEntries.reduce((sum, e) => sum + Number(e.netWeight), 0);

          // Update the lifting with buyer weight
          const lifting = await prisma.cementLifting.findUnique({
            where: { id: entry.liftingId },
            select: { factoryWeight: true },
          });

          if (lifting) {
            const shortage = Number(lifting.factoryWeight) - totalBuyerWeight;
            await prisma.cementLifting.update({
              where: { id: entry.liftingId },
              data: {
                buyerWeighbridgeQty: totalBuyerWeight,
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

        const totalBuyerWeight = buyerEntries.reduce((sum, e) => sum + Number(e.netWeight), 0);
        const lifting = await prisma.cementLifting.findUnique({
          where: { id: entry.liftingId },
          select: { factoryWeight: true },
        });

        if (lifting) {
          const shortage = Number(lifting.factoryWeight) - totalBuyerWeight;
          await prisma.cementLifting.update({
            where: { id: entry.liftingId },
            data: {
              buyerWeighbridgeQty: totalBuyerWeight,
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
