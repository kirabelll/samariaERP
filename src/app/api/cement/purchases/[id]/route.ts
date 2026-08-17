import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { journalCementPurchaseApproved } from '@/lib/accounting';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const purchase = await prisma.cementPurchase.findUnique({
      where: { id: params.id },
      include: {
        factory: true,
        liftings: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { truck: true },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: 'Cement purchase not found' },
        { status: 404 }
      );
    }

    // Compute total paid dynamically across BankTransactions and PaymentVouchers
    const bankTxns = await prisma.bankTransaction.findMany({
      where: {
        OR: [
          { refModule: 'CEMENT_PURCHASE', refId: params.id },
          { description: { contains: purchase.purchaseNo, mode: 'insensitive' } },
        ],
      },
      select: { amount: true },
    });
    const bankPaid = bankTxns.reduce((sum, t) => sum + Number(t.amount), 0);

    const paymentVouchers = await prisma.paymentVoucher.findMany({
      where: {
        sourceModule: { in: ['CEMENT', 'CEMENT_PURCHASE', 'cement'] },
        OR: [
          { sourceId: purchase.id },
          { sourceRef: { contains: purchase.purchaseNo, mode: 'insensitive' } },
        ],
        status: { notIn: ['Cancelled', 'Rejected'] },
      },
      select: { amount: true },
    });
    const voucherPaid = paymentVouchers.reduce((sum, v) => sum + Number(v.amount), 0);

    const totalPaid = Math.max(Number((purchase as any).paidAmount || 0), bankPaid + voucherPaid);
    const totalAmount = Number(purchase.totalAmount);

    let paymentStatus = (purchase as any).paymentStatus || 'Unpaid';
    if (totalPaid >= totalAmount || Math.abs(totalAmount - totalPaid) < 1) {
      paymentStatus = 'Paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'Partial';
    }

    let newStatus = purchase.status;
    if ((paymentStatus === 'Paid' || paymentStatus === 'Partial') && (purchase.status === 'Approved' || purchase.status === 'Checked' || purchase.status === 'Pending')) {
      newStatus = 'Active';
    }

    // If DB record was out of sync, sync DB
    if ((purchase as any).paidAmount !== totalPaid || (purchase as any).paymentStatus !== paymentStatus || purchase.status !== newStatus) {
      try {
        await prisma.cementPurchase.update({
          where: { id: params.id },
          data: {
            paidAmount: totalPaid,
            paymentStatus,
            status: newStatus,
          },
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      data: {
        ...purchase,
        quantityTons: Number(purchase.quantityTons),
        unitPrice: Number(purchase.unitPrice),
        totalAmount,
        balanceRemaining: Number(purchase.balanceRemaining),
        paidAmount: totalPaid,
        paymentStatus,
      },
    });
  } catch (error: any) {
    console.error('Error fetching cement purchase:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { action, notes } = body;

    const purchase = await prisma.cementPurchase.findUnique({
      where: { id: params.id },
    });

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: 'Cement purchase not found' },
        { status: 404 }
      );
    }

    let newStatus = purchase.status;

    switch (action) {
      case 'check':
        // Finance checks the purchase (Pending → Checked)
        if (purchase.status !== 'Pending') {
          return NextResponse.json(
            { success: false, error: `Cannot check a purchase with status "${purchase.status}". Must be "Pending".` },
            { status: 400 }
          );
        }
        newStatus = 'Checked';
        break;

      case 'approve':
        // Manager approves (Checked → Approved — purchase is NOT Active until paid)
        if (purchase.status !== 'Checked') {
          return NextResponse.json(
            { success: false, error: `Cannot approve a purchase with status "${purchase.status}". Must be "Checked" first.` },
            { status: 400 }
          );
        }
        newStatus = 'Approved';
        break;

      case 'reject':
        // Reject at any pre-Active stage
        if (purchase.status !== 'Pending' && purchase.status !== 'Checked' && purchase.status !== 'Approved') {
          return NextResponse.json(
            { success: false, error: `Cannot reject a purchase with status "${purchase.status}".` },
            { status: 400 }
          );
        }
        newStatus = 'Rejected';
        break;

      case 'cancel':
        newStatus = 'Cancelled';
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: "${action}". Use check, approve, reject, or cancel.` },
          { status: 400 }
        );
    }

    const updated = await prisma.cementPurchase.update({
      where: { id: params.id },
      data: { status: newStatus },
      include: { factory: true },
    });

    // Auto-create journal entry when purchase is approved
    let journalResult = null;
    if (action === 'approve' && newStatus === 'Approved') {
      journalResult = await journalCementPurchaseApproved(updated);
      if (journalResult.created) {
        notify({
          module: 'FINANCE',
          event: 'auto_journal_posted',
          details: {
            source: 'Cement Purchase',
            ref: updated.purchaseNo,
            journalNo: journalResult.voucherNo,
            amount: Number(updated.totalAmount),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        quantityTons: Number(updated.quantityTons),
        unitPrice: Number(updated.unitPrice),
        totalAmount: Number(updated.totalAmount),
        balanceRemaining: Number(updated.balanceRemaining),
      },
      ...(journalResult ? { journal: journalResult } : {}),
    });
  } catch (error: any) {
    console.error('Error updating cement purchase:', error);
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
    const purchase = await prisma.cementPurchase.findUnique({
      where: { id: params.id },
      include: {
        liftings: { select: { id: true, liftingNo: true } },
        coupons: { select: { id: true, couponNo: true } },
        balances: { select: { id: true } },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: 'Cement purchase not found' },
        { status: 404 }
      );
    }

    if (purchase.liftings && purchase.liftings.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete purchase "${purchase.purchaseNo}" because it has ${purchase.liftings.length} associated lifting(s). Please delete or cancel liftings first.`,
        },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.coupon.deleteMany({ where: { purchaseId: params.id } }),
      prisma.cementBalance.deleteMany({ where: { purchaseId: params.id } }),
      prisma.cementPurchase.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Cement purchase ${purchase.purchaseNo} deleted successfully`,
    });
  } catch (error: any) {
    console.error('Error deleting cement purchase:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete cement purchase' },
      { status: 500 }
    );
  }
}

