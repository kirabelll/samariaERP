import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { notify } from '@/lib/telegram';
import { createJournalEntries, ACCOUNTS } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cement/purchases/[id]/payments
 * Returns all bank transactions linked to this cement purchase.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        refModule: 'CEMENT_PURCHASE',
        refId: params.id,
      },
      include: {
        bankAccount: {
          select: { id: true, bankName: true, accountNo: true, accountName: true },
        },
      },
      orderBy: { transDate: 'desc' },
    });

    // Also get the purchase summary
    const purchase = await prisma.cementPurchase.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        purchaseNo: true,
        totalAmount: true,
        paidAmount: true,
        paymentStatus: true,
      },
    });

    const totalPaid = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const remainingPayable = purchase ? Number(purchase.totalAmount) - totalPaid : 0;

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        summary: {
          totalAmount: purchase ? Number(purchase.totalAmount) : 0,
          totalPaid,
          remainingPayable: Math.max(0, remainingPayable),
          paymentStatus: purchase?.paymentStatus || 'Unpaid',
          paymentCount: transactions.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching purchase payments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cement/purchases/[id]/payments
 * Record a bank payment against a cement purchase.
 *
 * Body: { bankAccountId, amount, refNo?, description?, transDate?, createdBy? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { bankAccountId, amount, refNo, description, transDate, createdBy } = body;

    if (!bankAccountId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'bankAccountId and a positive amount are required' },
        { status: 400 }
      );
    }

    // Verify purchase exists
    const purchase = await prisma.cementPurchase.findUnique({
      where: { id: params.id },
      include: { factory: true },
    });

    if (!purchase) {
      return NextResponse.json(
        { success: false, error: 'Cement purchase not found' },
        { status: 404 }
      );
    }

    // Verify bank account exists
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    const paymentAmount = parseFloat(amount);
    const currentPaid = Number(purchase.paidAmount) || 0;
    const totalAmount = Number(purchase.totalAmount);
    const newPaidTotal = currentPaid + paymentAmount;

    // Determine new payment status
    let paymentStatus = 'Partial';
    if (newPaidTotal >= totalAmount) {
      paymentStatus = 'Paid';
    } else if (newPaidTotal <= 0) {
      paymentStatus = 'Unpaid';
    }

    // Create the bank transaction linked to this purchase
    const transaction = await prisma.bankTransaction.create({
      data: {
        bankAccountId,
        type: 'withdrawal',
        amount: paymentAmount,
        refNo: refNo || `PAY-${purchase.purchaseNo}`,
        description: description || `Cement purchase payment — ${purchase.purchaseNo} — ${purchase.factory?.name || 'Factory'}`,
        refModule: 'CEMENT_PURCHASE',
        refId: params.id,
        transDate: transDate ? new Date(transDate) : new Date(),
        reconStatus: 'Pending',
        createdBy: createdBy || null,
      },
      include: {
        bankAccount: {
          select: { id: true, bankName: true, accountNo: true, accountName: true },
        },
      },
    });

    // Update purchase payment tracking
    // If purchase is Approved and now fully paid, auto-activate it
    const purchaseStatusUpdate: any = {
      paidAmount: newPaidTotal,
      paymentStatus,
      paymentRef: refNo || purchase.paymentRef,
      paymentDate: new Date(),
    };
    if (paymentStatus === 'Paid' && purchase.status === 'Approved') {
      purchaseStatusUpdate.status = 'Active';
    }
    await prisma.cementPurchase.update({
      where: { id: params.id },
      data: purchaseStatusUpdate,
    });

    // Update bank account balance
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: {
        balance: { decrement: paymentAmount },
      },
    });

    // Auto-create double-entry journal: Debit Accounts Payable, Credit Bank
    try {
      const journalResult = await createJournalEntries({
        lines: [
          {
            accountCode: ACCOUNTS.ACCOUNTS_PAYABLE,
            accountFallbackName: 'Accounts Payable',
            debit: paymentAmount,
            credit: 0,
            description: `Cement purchase payment — ${purchase.purchaseNo} — ${purchase.factory?.name || 'Factory'}`,
          },
          {
            accountCode: ACCOUNTS.BANK,
            accountFallbackName: 'Bank',
            debit: 0,
            credit: paymentAmount,
            description: `Cement purchase payment — ${purchase.purchaseNo} — ${purchase.factory?.name || 'Factory'}`,
          },
        ],
        refModule: 'CEMENT_PURCHASE',
        refId: params.id,
        postedBy: createdBy || 'system',
      });

      if (journalResult.created) {
        notify({
          module: 'FINANCE',
          event: 'auto_journal_posted',
          details: {
            source: 'Cement Purchase Payment',
            ref: purchase.purchaseNo,
            journalNo: journalResult.voucherNo,
            amount: paymentAmount,
          },
        });
      }
    } catch (journalErr) {
      console.error('Auto-journal for cement payment failed:', journalErr);
    }

    // Telegram notification
    const purchaseActivated = paymentStatus === 'Paid' && purchase.status === 'Approved';
    notify({
      module: 'CEMENT',
      event: 'cement_purchase',
      details: {
        action: purchaseActivated ? 'Payment Recorded — PURCHASE ACTIVATED' : 'Payment Recorded',
        purchaseNo: purchase.purchaseNo,
        factory: purchase.factory?.name,
        paymentAmount: `ETB ${paymentAmount.toLocaleString('en-US')}`,
        totalPaid: `ETB ${newPaidTotal.toLocaleString('en-US')}`,
        remaining: `ETB ${Math.max(0, totalAmount - newPaidTotal).toLocaleString('en-US')}`,
        status: paymentStatus,
        bank: `${bankAccount.bankName} — ${bankAccount.accountNo}`,
        refNo: refNo || '—',
        ...(purchaseActivated ? { note: 'Purchase is now Active — coupons and liftings are enabled' } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        transaction,
        paymentSummary: {
          totalAmount,
          totalPaid: newPaidTotal,
          remainingPayable: Math.max(0, totalAmount - newPaidTotal),
          paymentStatus,
        },
        ...(purchaseActivated ? { purchaseActivated: true } : {}),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error recording purchase payment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
