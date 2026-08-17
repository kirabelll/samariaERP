import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/finance/bank/transactions/[id]
 * Delete a bank transaction and adjust the associated bank account balance.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const txnId = params.id;
    if (!txnId) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const transaction = await prisma.bankTransaction.findUnique({
      where: { id: txnId },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Atomic transaction: delete transaction and adjust bank account balance
    await prisma.$transaction(async (tx) => {
      await tx.bankTransaction.delete({
        where: { id: txnId },
      });

      if (transaction.bankAccountId) {
        if (transaction.type === 'deposit') {
          await tx.bankAccount.update({
            where: { id: transaction.bankAccountId },
            data: { balance: { decrement: transaction.amount } },
          });
        } else if (transaction.type === 'withdrawal') {
          await tx.bankAccount.update({
            where: { id: transaction.bankAccountId },
            data: { balance: { increment: transaction.amount } },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting bank transaction:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
