import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { journalBankTransaction } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.bankAccount.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error('Error fetching record:', error);
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
    const body = await request.json();

    // Strip non-updatable and relation fields
    const { id: _id, createdAt: _ca, transactions: _transactions, reconciliations: _reconciliations, ...updateData } = body;

    // Ensure balance is a number (it may arrive as a string from the form)
    if (updateData.balance !== undefined) {
      updateData.balance = parseFloat(updateData.balance);
    }

    const record = await prisma.bankAccount.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    const updatedRecord = await prisma.bankAccount.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error: any) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/finance/bank/[id]
 * Recalculate bank account balance from all transactions.
 * Balance = sum(deposits) - sum(withdrawals)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const account = await prisma.bankAccount.findUnique({
      where: { id: params.id },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (_) {
      // Body may be empty if called without payload
    }

    // Check for an existing Initial Opening Balance transaction
    const initialTxn = await prisma.bankTransaction.findFirst({
      where: {
        bankAccountId: params.id,
        refModule: 'INITIAL_BALANCE',
      },
    });

    // Sum non-initial deposits and withdrawals
    const deposits = await prisma.bankTransaction.aggregate({
      where: { bankAccountId: params.id, type: 'deposit' },
      _sum: { amount: true },
      _count: true,
    });

    const withdrawals = await prisma.bankTransaction.aggregate({
      where: { bankAccountId: params.id, type: 'withdrawal' },
      _sum: { amount: true },
      _count: true,
    });

    let totalDeposits = Number(deposits._sum.amount || 0);
    const totalWithdrawals = Number(withdrawals._sum.amount || 0);

    let initialBalance = 0;

    if (body.initialBalance !== undefined && body.initialBalance !== null) {
      initialBalance = parseFloat(body.initialBalance) || 0;
      if (initialTxn) {
        await prisma.bankTransaction.update({
          where: { id: initialTxn.id },
          data: { amount: initialBalance },
        });
      } else if (initialBalance > 0) {
        const createdInitTxn = await prisma.bankTransaction.create({
          data: {
            bankAccountId: params.id,
            type: 'deposit',
            amount: initialBalance,
            refNo: 'INIT-' + account.accountNo,
            description: 'Initial Opening Balance',
            refModule: 'INITIAL_BALANCE',
            reconStatus: 'Reconciled',
            transDate: account.createdAt,
          },
        });
        try {
          await journalBankTransaction(createdInitTxn);
        } catch (jErr) {
          console.warn('Auto journal for bank initial balance failed:', jErr);
        }
      }
    } else if (initialTxn) {
      initialBalance = Number(initialTxn.amount);
    } else {
      // If no initial balance transaction exists, deduce baseline initial amount from stored balance & activity
      const netActivity = totalDeposits - totalWithdrawals;
      const implicitInitial = Math.max(0, Math.round((Number(account.balance) - netActivity) * 100) / 100);

      if (implicitInitial > 0) {
        initialBalance = implicitInitial;
        const createdImplicitTxn = await prisma.bankTransaction.create({
          data: {
            bankAccountId: params.id,
            type: 'deposit',
            amount: implicitInitial,
            refNo: 'INIT-' + account.accountNo,
            description: 'Initial Opening Balance',
            refModule: 'INITIAL_BALANCE',
            reconStatus: 'Reconciled',
            transDate: account.createdAt,
          },
        });
        try {
          await journalBankTransaction(createdImplicitTxn);
        } catch (jErr) {
          console.warn('Auto journal for bank implicit initial balance failed:', jErr);
        }
      }
    }

    // Re-aggregate deposits after handling initial balance
    const updatedDeposits = await prisma.bankTransaction.aggregate({
      where: { bankAccountId: params.id, type: 'deposit' },
      _sum: { amount: true },
      _count: true,
    });

    totalDeposits = Number(updatedDeposits._sum.amount || 0);
    const calculatedBalance = Math.round((totalDeposits - totalWithdrawals) * 100) / 100;
    const previousBalance = Number(account.balance);
    const difference = Math.round((calculatedBalance - previousBalance) * 100) / 100;

    // Update the balance
    const updatedAccount = await prisma.bankAccount.update({
      where: { id: params.id },
      data: { balance: calculatedBalance },
    });

    return NextResponse.json({
      success: true,
      data: updatedAccount,
      reconciliation: {
        initialBalance,
        totalDeposits,
        totalWithdrawals,
        depositCount: updatedDeposits._count,
        withdrawalCount: withdrawals._count,
        calculatedBalance,
        previousBalance,
        difference,
        corrected: difference !== 0,
      },
    });
  } catch (error: any) {
    console.error('Error recalculating bank balance:', error);
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
    const record = await prisma.bankAccount.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to Inactive/Cancelled
    const deletedRecord = await prisma.bankAccount.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({ success: true, message: 'Record deleted successfully', data: deletedRecord });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
