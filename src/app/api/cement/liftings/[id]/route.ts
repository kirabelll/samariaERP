import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lifting = await prisma.cementLifting.findUnique({
      where: { id: params.id },
      include: {
        purchase: true,
        factory: true,
        truck: true,
        customer: { select: { id: true, companyName: true, phone: true, tin: true, withholding: true, withholdRate: true, creditLimit: true, creditTermDays: true } },
        invoices: { select: { id: true, invoiceNo: true, totalAmount: true, status: true, invoiceDate: true }, orderBy: { invoiceDate: 'desc' } },
      },
    });

    if (!lifting) {
      return NextResponse.json(
        { success: false, error: 'Lifting not found' },
        { status: 404 }
      );
    }

    // Fetch linked coupon if couponId exists (no direct Prisma relation)
    let coupon = null;
    if (lifting.couponId) {
      coupon = await prisma.coupon.findUnique({
        where: { id: lifting.couponId },
        select: { id: true, couponNo: true, status: true, tonnage: true },
      });
    }

    return NextResponse.json({ success: true, data: { ...lifting, coupon } });
  } catch (error: any) {
    console.error('Error fetching cement lifting:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lifting = await prisma.cementLifting.findUnique({
      where: { id: params.id },
      include: { purchase: true, factory: true },
    });

    if (!lifting) {
      return NextResponse.json(
        { success: false, error: 'Lifting not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { id, createdAt, purchase, factory, truck, ...updateData } = body;

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      Lifted: ['Delivered', 'Cancelled'],
      Delivered: ['Verified', 'Lifted'],
      Verified: [],
      Cancelled: [],
    };

    if (updateData.status) {
      const currentStatus = lifting.status;
      const newStatus = updateData.status;

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        return NextResponse.json(
          { success: false, error: `Cannot transition from ${currentStatus} to ${newStatus}` },
          { status: 400 }
        );
      }
    }

    // Recalculate shortage if weights are updated
    if (updateData.buyerWeighbridgeQty !== undefined || updateData.factoryWeight !== undefined) {
      const fw = updateData.factoryWeight ?? lifting.factoryWeight;
      const bw = updateData.buyerWeighbridgeQty ?? lifting.buyerWeighbridgeQty;
      if (bw !== null && bw !== undefined) {
        updateData.shortageQty = fw - bw;
      }
    }

    const isConfirming = updateData.status === 'Delivered' && lifting.status === 'Lifted';

    // Auto-sum verified BUYER weighbridge entries when marking as Delivered
    if (isConfirming && !updateData.buyerWeighbridgeQty) {
      try {
        const buyerEntries = await prisma.cementWeighbridge.findMany({
          where: {
            liftingId: params.id,
            weighbridgeType: 'BUYER',
            verified: true,
          },
          select: { netWeight: true },
        });

        if (buyerEntries.length > 0) {
          const totalBuyerWeight = buyerEntries.reduce((sum: number, e: any) => sum + Number(e.netWeight), 0);
          updateData.buyerWeighbridgeQty = totalBuyerWeight;
          updateData.shortageQty = lifting.factoryWeight - totalBuyerWeight;
        }
      } catch (err) {
        console.error('[Lifting] Failed to auto-sum buyer weighbridge:', err);
      }
    }

    const updatedLifting = await prisma.cementLifting.update({
      where: { id: params.id },
      data: updateData,
      include: { purchase: true, factory: true, truck: true },
    });

    // Factory balance is already updated at lifting creation time.
    // On delivery confirmation, we only handle shortage penalties.
    let balanceResult = null;
    if (isConfirming || (updateData.status === 'Verified' && lifting.status === 'Delivered')) {
      if (isConfirming) {
        // Auto-calculate shortage penalty and create CementPenalty record
        if (updatedLifting.shortageQty && updatedLifting.shortageQty > 0) {
          // Penalty rate = purchase unit price per ton (e.g., ETB 4,200/ton)
          const penaltyRate = Number(updatedLifting.purchase?.unitPrice) || 0;
          const penaltyAmount = updatedLifting.shortageQty * penaltyRate;

          // Update lifting penalty field
          await prisma.cementLifting.update({
            where: { id: params.id },
            data: { shortagePenalty: penaltyAmount },
          });

          // Auto-create CementPenalty record
          const penCount = await prisma.cementPenalty.count();
          const penaltyNo = `PEN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(penCount + 1).padStart(4, '0')}`;

          await prisma.cementPenalty.create({
            data: {
              penaltyNo,
              liftingId: params.id,
              truckPlateNo: updatedLifting.truck?.plateNo || '',
              penaltyType: 'SHORTAGE',
              shortageQty: updatedLifting.shortageQty,
              penaltyRate,
              penaltyAmount,
              recoveryStatus: 'Pending',
              notes: `Auto-generated from lifting ${updatedLifting.liftingNo} | Factory: ${updatedLifting.factoryWeight}T, Buyer: ${updatedLifting.buyerWeighbridgeQty}T`,
            },
          });

          // Auto-log exception for significant shortages (>2% of factory weight)
          const shortagePercent = (updatedLifting.shortageQty / updatedLifting.factoryWeight) * 100;
          if (shortagePercent > 2) {
            await prisma.exceptionLog.create({
              data: {
                exceptionType: 'SHORTAGE_MISMATCH',
                severity: shortagePercent > 5 ? 'Critical' : 'High',
                module: 'CEMENT',
                recordId: params.id,
                recordRef: updatedLifting.liftingNo,
                description: `Cement shortage ${shortagePercent.toFixed(1)}% (${updatedLifting.shortageQty}T) on lifting ${updatedLifting.liftingNo}`,
                status: 'Open',
              },
            });
          }
        }

        // Telegram notification for delivery + balance update
        const shortageInfo = updatedLifting.shortageQty && updatedLifting.shortageQty > 0
          ? ` Shortage: ${updatedLifting.shortageQty}T (${((updatedLifting.shortageQty / updatedLifting.factoryWeight) * 100).toFixed(1)}%)`
          : '';

        notify({
          module: 'CEMENT',
          event: 'lifting_delivered',
          details: {
            liftingNo: updatedLifting.liftingNo,
            factoryWeight: updatedLifting.factoryWeight,
            buyerWeight: updatedLifting.buyerWeighbridgeQty,
            shortage: updatedLifting.shortageQty,
            balance: balanceResult,
            message: `Lifting ${updatedLifting.liftingNo} delivered. Factory: ${updatedLifting.factoryWeight}T, Buyer: ${updatedLifting.buyerWeighbridgeQty || 'N/A'}T.${shortageInfo}`,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedLifting,
      ...(balanceResult ? { balance: balanceResult } : {}),
    });
  } catch (error: any) {
    console.error('Error updating cement lifting:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lifting = await prisma.cementLifting.findUnique({
      where: { id: params.id },
      include: {
        purchase: true,
        invoices: { select: { id: true, invoiceNo: true, status: true } },
      },
    });

    if (!lifting) {
      return NextResponse.json(
        { success: false, error: 'Cement lifting not found' },
        { status: 404 }
      );
    }

    // Check for linked active (non-cancelled) invoices
    const activeInvoices = lifting.invoices.filter((inv) => inv.status !== 'Cancelled');
    if (activeInvoices.length > 0) {
      const invNumbers = activeInvoices.map((inv) => inv.invoiceNo).join(', ');
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete lifting ${lifting.liftingNo} because it has active sales invoice(s) attached: ${invNumbers}. Cancel or delete the invoice(s) first.`,
        },
        { status: 400 }
      );
    }

    // 1. Revert coupon status if used by this lifting
    if (lifting.couponId) {
      try {
        const coupon = await prisma.coupon.findUnique({
          where: { id: lifting.couponId },
          select: { id: true, status: true },
        });
        if (coupon && coupon.status === 'USED') {
          await prisma.coupon.update({
            where: { id: lifting.couponId },
            data: { status: 'COLLECTED', usedDate: null },
          });
        }
      } catch (couponErr) {
        console.error('[Lifting DELETE] Error reverting coupon status:', couponErr);
      }
    }

    // 2. Revert factory balance
    try {
      const existingBalance = await prisma.cementBalance.findUnique({
        where: {
          purchaseId_factoryId: {
            purchaseId: lifting.purchaseId,
            factoryId: lifting.factoryId,
          },
        },
      });

      if (existingBalance) {
        const newLiftedQty = Math.max(0, existingBalance.liftedQty - lifting.factoryWeight);
        await prisma.cementBalance.update({
          where: {
            purchaseId_factoryId: {
              purchaseId: lifting.purchaseId,
              factoryId: lifting.factoryId,
            },
          },
          data: {
            liftedQty: newLiftedQty,
            remainingQty: Math.max(0, existingBalance.initialQty - newLiftedQty),
            lastUpdated: new Date(),
          },
        });
      }
    } catch (balErr) {
      console.error('[Lifting DELETE] Error updating cement balance:', balErr);
    }

    // 3. Revert purchase balance remaining
    try {
      const remainingLifted = await prisma.cementLifting.aggregate({
        where: {
          purchaseId: lifting.purchaseId,
          id: { not: params.id },
          status: { in: ['Lifted', 'Delivered', 'Verified'] },
        },
        _sum: { factoryWeight: true },
      });

      const purchaseQty = Number(lifting.purchase?.quantityTons || 0);
      const remainingLiftedWeight = Number(remainingLifted._sum.factoryWeight || 0);
      const newPurchaseBalance = Math.max(0, purchaseQty - remainingLiftedWeight);

      await prisma.cementPurchase.update({
        where: { id: lifting.purchaseId },
        data: {
          balanceRemaining: newPurchaseBalance,
          status: newPurchaseBalance > 0 ? 'Active' : 'Exhausted',
        },
      });
    } catch (purchErr) {
      console.error('[Lifting DELETE] Error updating purchase balance:', purchErr);
    }

    // 4. Delete auto-generated CementPenalty records linked to this lifting
    try {
      await prisma.cementPenalty.deleteMany({
        where: { liftingId: params.id },
      });
    } catch (penErr) {
      console.error('[Lifting DELETE] Error deleting linked penalties:', penErr);
    }

    // 5. Unlink weighbridge entries
    try {
      await prisma.cementWeighbridge.updateMany({
        where: { liftingId: params.id },
        data: { liftingId: null },
      });
    } catch (wbErr) {
      console.error('[Lifting DELETE] Error unlinking weighbridge entries:', wbErr);
    }

    // 6. Delete the cement lifting record
    await prisma.cementLifting.delete({
      where: { id: params.id },
    });

    notify({
      module: 'CEMENT',
      event: 'cement_lifting_deleted',
      details: { liftingNo: lifting.liftingNo, factoryWeight: lifting.factoryWeight },
    });

    return NextResponse.json({
      success: true,
      message: `Cement lifting ${lifting.liftingNo} deleted successfully`,
    });
  } catch (error: any) {
    console.error('Error deleting cement lifting:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

