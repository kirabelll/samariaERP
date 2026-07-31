import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Sum all deposits
    const deposits = await prisma.bankTransaction.aggregate({
      where: { bankAccountId: params.id, type: 'deposit' },
      _sum: { amount: true },
      _count: true,
    });

    // Sum all withdrawals
    const withdrawals = await prisma.bankTransaction.aggregate({
      where: { bankAccountId: params.id, type: 'withdrawal' },
      _sum: { amount: true },
      _count: true,
    });

    const totalDeposits = Number(deposits._sum.amount || 0);
    const totalWithdrawals = Number(withdrawals._sum.amount || 0);
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
        totalDeposits,
        totalWithdrawals,
        depositCount: deposits._count,
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
