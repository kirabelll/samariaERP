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

    // Resolve Customer Sales Agreement Unit Price for this customer & cement type
    let customerUnitPrice = 0;
    let customerAgreementNo = '';
    if (lifting.customerId) {
      const activeAgreement = await prisma.salesAgreement.findFirst({
        where: {
          customerId: lifting.customerId,
          status: { notIn: ['Void', 'Cancelled'] },
        },
        select: { agreementNo: true, items: true },
        orderBy: { createdAt: 'desc' },
      });

      if (activeAgreement) {
        customerAgreementNo = activeAgreement.agreementNo || '';
        if (activeAgreement.items) {
          try {
            const parsed = typeof activeAgreement.items === 'string'
              ? JSON.parse(activeAgreement.items)
              : (activeAgreement.items as any[] || []);

            if (Array.isArray(parsed) && parsed.length > 0) {
              const cementType = (lifting.purchase?.cementType || '').toUpperCase();
              const matched = parsed.find((item: any) => {
                const name = (item.itemName || item.name || item.description || '').toUpperCase();
                const type = (item.cementType || '').toUpperCase();
                return (
                  (cementType && type === cementType) ||
                  (cementType && name.includes(cementType))
                );
              }) || parsed[0];

              if (matched) {
                customerUnitPrice = Number(matched.unitPrice || matched.pricePerUnit || matched.price || matched.amount || 0);
              }
            }
          } catch {}
        }
      }
    }

    // Fallback to purchase unitPrice if no customer agreement price found
    if (!customerUnitPrice && lifting.purchase?.unitPrice) {
      customerUnitPrice = Number(lifting.purchase.unitPrice);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...lifting,
        coupon,
        customerUnitPrice,
        customerAgreementPrice: customerUnitPrice,
        customerAgreementNo,
      },
    });
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
    const { id, createdAt, purchase, factory, truck, ...rawUpdateData } = body;

    const updateData: any = {};

    // String fields
    if (rawUpdateData.deliveryNoteNo !== undefined) updateData.deliveryNoteNo = rawUpdateData.deliveryNoteNo?.trim() || null;
    if (rawUpdateData.notes !== undefined) updateData.notes = rawUpdateData.notes?.trim() || null;
    if (rawUpdateData.factoryWeighbridgeRef !== undefined) updateData.factoryWeighbridgeRef = rawUpdateData.factoryWeighbridgeRef;
    if (rawUpdateData.registeredBy !== undefined) updateData.registeredBy = rawUpdateData.registeredBy;

    // Relational ID fields
    if (rawUpdateData.purchaseId !== undefined) updateData.purchaseId = rawUpdateData.purchaseId;
    if (rawUpdateData.factoryId !== undefined) updateData.factoryId = rawUpdateData.factoryId;
    if (rawUpdateData.truckId !== undefined) updateData.truckId = rawUpdateData.truckId;
    if (rawUpdateData.customerId !== undefined) updateData.customerId = rawUpdateData.customerId;
    if (rawUpdateData.couponId !== undefined) updateData.couponId = rawUpdateData.couponId || null;

    // Date
    if (rawUpdateData.liftingDate !== undefined) {
      updateData.liftingDate = rawUpdateData.liftingDate ? new Date(rawUpdateData.liftingDate) : new Date();
    }

    // Numbers
    if (rawUpdateData.factoryWeight !== undefined && rawUpdateData.factoryWeight !== null && rawUpdateData.factoryWeight !== '') {
      updateData.factoryWeight = parseFloat(rawUpdateData.factoryWeight);
    }
    if (rawUpdateData.buyerWeighbridgeQty !== undefined) {
      updateData.buyerWeighbridgeQty = (rawUpdateData.buyerWeighbridgeQty !== null && rawUpdateData.buyerWeighbridgeQty !== '')
        ? parseFloat(rawUpdateData.buyerWeighbridgeQty)
        : null;
    }

    // Status transition validation
    const validTransitions: Record<string, string[]> = {
      Lifted: ['Lifted', 'Delivered', 'Cancelled'],
      Delivered: ['Delivered', 'Verified', 'Lifted', 'Cancelled'],
      Verified: ['Verified', 'Delivered', 'Lifted'],
      Cancelled: ['Cancelled', 'Lifted'],
    };

    if (rawUpdateData.status) {
      const currentStatus = lifting.status;
      const newStatus = rawUpdateData.status;

      if (newStatus !== currentStatus && !validTransitions[currentStatus]?.includes(newStatus)) {
        return NextResponse.json(
          { success: false, error: `Cannot transition from ${currentStatus} to ${newStatus}` },
          { status: 400 }
        );
      }
      updateData.status = newStatus;
    }

    // Recalculate shortage if weights are updated
    const fw = updateData.factoryWeight !== undefined ? updateData.factoryWeight : lifting.factoryWeight;
    const bw = updateData.buyerWeighbridgeQty !== undefined ? updateData.buyerWeighbridgeQty : lifting.buyerWeighbridgeQty;
    if (bw !== null && bw !== undefined) {
      updateData.shortageQty = fw - bw;
    } else if (updateData.buyerWeighbridgeQty === null) {
      updateData.shortageQty = null;
    }

    const isConfirming = updateData.status === 'Delivered' && lifting.status === 'Lifted';

    // Auto-sum verified BUYER weighbridge entries when marking as Delivered if not explicitly provided
    if (isConfirming && updateData.buyerWeighbridgeQty === undefined && !lifting.buyerWeighbridgeQty) {
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
          updateData.shortageQty = fw - totalBuyerWeight;
        }
      } catch (err) {
        console.error('[Lifting] Failed to auto-sum buyer weighbridge:', err);
      }
    }

    // Handle coupon status changes
    if (updateData.couponId !== undefined && updateData.couponId !== lifting.couponId) {
      // Revert previous coupon if any
      if (lifting.couponId) {
        try {
          await prisma.coupon.update({
            where: { id: lifting.couponId },
            data: { status: 'COLLECTED', usedDate: null },
          });
        } catch (cErr) {
          console.error('[Lifting PUT] Error reverting old coupon:', cErr);
        }
      }
      // Mark new coupon as USED
      if (updateData.couponId) {
        try {
          await prisma.coupon.update({
            where: { id: updateData.couponId },
            data: { status: 'USED', usedDate: new Date() },
          });
        } catch (cErr) {
          console.error('[Lifting PUT] Error marking new coupon as USED:', cErr);
        }
      }
    }

    // Handle factory weight change effect on factory balance and purchase balance
    const weightDiff = (updateData.factoryWeight !== undefined) ? (updateData.factoryWeight - lifting.factoryWeight) : 0;
    if (weightDiff !== 0) {
      try {
        const existingBalance = await prisma.cementBalance.findUnique({
          where: {
            purchaseId_factoryId: {
              purchaseId: updateData.purchaseId || lifting.purchaseId,
              factoryId: updateData.factoryId || lifting.factoryId,
            },
          },
        });
        if (existingBalance) {
          const newLifted = Math.max(0, existingBalance.liftedQty + weightDiff);
          await prisma.cementBalance.update({
            where: {
              purchaseId_factoryId: {
                purchaseId: updateData.purchaseId || lifting.purchaseId,
                factoryId: updateData.factoryId || lifting.factoryId,
              },
            },
            data: {
              liftedQty: newLifted,
              remainingQty: Math.max(0, existingBalance.initialQty - newLifted),
              lastUpdated: new Date(),
            },
          });
        }

        // Update purchase balance
        const targetPurchaseId = updateData.purchaseId || lifting.purchaseId;
        const totalLiftedSum = await prisma.cementLifting.aggregate({
          where: {
            purchaseId: targetPurchaseId,
            id: { not: params.id },
            status: { in: ['Lifted', 'Delivered', 'Verified'] },
          },
          _sum: { factoryWeight: true },
        });
        const currentOtherLifted = Number(totalLiftedSum._sum.factoryWeight || 0);
        const newTotalLifted = currentOtherLifted + (updateData.factoryWeight ?? lifting.factoryWeight);
        const purchaseRecord = await prisma.cementPurchase.findUnique({ where: { id: targetPurchaseId } });
        if (purchaseRecord) {
          const newPurchaseRemaining = Math.max(0, purchaseRecord.quantityTons - newTotalLifted);
          await prisma.cementPurchase.update({
            where: { id: targetPurchaseId },
            data: {
              balanceRemaining: newPurchaseRemaining,
              status: newPurchaseRemaining > 0 ? 'Active' : 'Exhausted',
            },
          });
        }
      } catch (bErr) {
        console.error('[Lifting PUT] Error updating balances for weight change:', bErr);
      }
    }

    const updatedLifting = await prisma.cementLifting.update({
      where: { id: params.id },
      data: updateData,
      include: { purchase: true, factory: true, truck: true },
    });

    // Shortage penalties on delivery confirmation
    let balanceResult = null;
    if (isConfirming || (updateData.status === 'Verified' && lifting.status === 'Delivered')) {
      if (isConfirming) {
        if (updatedLifting.shortageQty && updatedLifting.shortageQty > 0) {
          const penaltyRate = Number(updatedLifting.purchase?.unitPrice) || 0;
          const penaltyAmount = updatedLifting.shortageQty * penaltyRate;

          await prisma.cementLifting.update({
            where: { id: params.id },
            data: { shortagePenalty: penaltyAmount },
          });

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

