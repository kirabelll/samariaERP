import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/finance/bank/transactions/reverse
 * Reverses a bank transaction (defaults to the last transaction if transactionId is not provided).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankAccountId, transactionId, reason } = body;

    if (!bankAccountId && !transactionId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: bankAccountId or transactionId' },
        { status: 400 }
      );
    }

    // Find the target transaction
    let targetTxn: any = null;
    if (transactionId) {
      targetTxn = await prisma.bankTransaction.findUnique({
        where: { id: transactionId },
        include: { bankAccount: true },
      });
    } else {
      targetTxn = await prisma.bankTransaction.findFirst({
        where: { bankAccountId },
        orderBy: [{ transDate: 'desc' }, { createdAt: 'desc' }],
        include: { bankAccount: true },
      });
    }

    if (!targetTxn) {
      return NextResponse.json(
        { success: false, error: 'No transaction found to reverse' },
        { status: 404 }
      );
    }

    if (targetTxn.refModule === 'REVERSAL') {
      return NextResponse.json(
        { success: false, error: 'Cannot reverse an already existing reversal transaction' },
        { status: 400 }
      );
    }

    const targetAccount = targetTxn.bankAccount;
    if (!targetAccount) {
      return NextResponse.json(
        { success: false, error: 'Associated bank account not found' },
        { status: 404 }
      );
    }

    const oppositeType = targetTxn.type === 'deposit' ? 'withdrawal' : 'deposit';
    const amount = Number(targetTxn.amount);
    const revRefNo = `REV-${targetTxn.refNo || targetTxn.id.slice(-8)}`;
    const revDescription = `Reversal of ${targetTxn.type.toUpperCase()} [${targetTxn.refNo || targetTxn.id.slice(-6)}]: ${targetTxn.description || ''}${reason ? ` (Reason: ${reason})` : ''}`;

    // Validate balance if reversing a deposit (which creates a withdrawal)
    if (oppositeType === 'withdrawal' && targetAccount.balance < amount) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient balance to reverse deposit of ETB ${amount.toLocaleString('en-US')}. Current balance: ETB ${targetAccount.balance.toLocaleString('en-US')}`,
        },
        { status: 400 }
      );
    }

    // Execute atomic reversal
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create reversal transaction
      const reversal = await tx.bankTransaction.create({
        data: {
          bankAccountId: targetAccount.id,
          type: oppositeType,
          amount: amount,
          refNo: revRefNo,
          description: revDescription,
          refModule: 'REVERSAL',
          refId: targetTxn.id,
          transDate: new Date(),
          reconStatus: 'Pending',
          createdBy: 'System (Reversal)',
        },
      });

      // 2. Update bank account balance
      const updatedAccount = await tx.bankAccount.update({
        where: { id: targetAccount.id },
        data: {
          balance: oppositeType === 'deposit'
            ? { increment: amount }
            : { decrement: amount },
        },
      });

      return { reversal, updatedAccount };
    });

    return NextResponse.json({
      success: true,
      data: result.reversal,
      accountBalance: result.updatedAccount.balance,
      message: `Successfully reversed ${targetTxn.type} of ETB ${amount.toLocaleString('en-US')}`,
    });
  } catch (error: any) {
    console.error('Error reversing bank transaction:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
