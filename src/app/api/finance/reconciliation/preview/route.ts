import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/finance/reconciliation/preview
 * Query bank account beginning balance and all system transactions for a specified period.
 * Computes System Collections, Payments, Total Collections (Beginning + Collections), Total Payments, and System Ending Balance.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bankAccountId = searchParams.get('bankAccountId');
    const periodFrom = searchParams.get('periodFrom');
    const periodTo = searchParams.get('periodTo');

    if (!bankAccountId || !periodFrom || !periodTo) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: bankAccountId, periodFrom, periodTo' },
        { status: 400 }
      );
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    // Set time boundaries for period
    const startDate = new Date(periodFrom);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(periodTo);
    endDate.setHours(23, 59, 59, 999);

    // 1. Calculate System Beginning Balance (all transactions before startDate)
    const priorDeposits = await prisma.bankTransaction.aggregate({
      where: {
        bankAccountId,
        type: 'deposit',
        transDate: { lt: startDate },
      },
      _sum: { amount: true },
    });

    const priorWithdrawals = await prisma.bankTransaction.aggregate({
      where: {
        bankAccountId,
        type: { in: ['withdrawal', 'transfer'] },
        transDate: { lt: startDate },
      },
      _sum: { amount: true },
    });

    const systemBeginning = Math.round(
      (Number(priorDeposits._sum.amount || 0) - Number(priorWithdrawals._sum.amount || 0)) * 100
    ) / 100;

    // 2. Fetch all system transactions within the period
    const rawTransactions = await prisma.bankTransaction.findMany({
      where: {
        bankAccountId,
        transDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [
        { transDate: 'asc' },
        { id: 'asc' },
      ],
    });

    // 3. Format transactions with index, collection, payment, etc.
    let count = 1;
    let periodCollectionsSum = 0;
    let periodPaymentsSum = 0;

    const transactions = rawTransactions.map((txn) => {
      const isDeposit = txn.type === 'deposit';
      const isPayment = txn.type === 'withdrawal' || txn.type === 'transfer';
      const collectionAmount = isDeposit ? Number(txn.amount) : 0;
      const paymentAmount = isPayment ? Number(txn.amount) : 0;

      periodCollectionsSum += collectionAmount;
      periodPaymentsSum += paymentAmount;

      const dateStr = new Date(txn.transDate).toISOString().split('T')[0];

      return {
        id: txn.id,
        index: count++,
        date: dateStr,
        refNo: txn.refNo || '',
        collection: collectionAmount,
        payment: paymentAmount,
        desc: txn.description || (isDeposit ? 'Deposit' : 'Payment'),
        type: txn.type,
        reconStatus: txn.reconStatus,
      };
    });

    periodCollectionsSum = Math.round(periodCollectionsSum * 100) / 100;
    periodPaymentsSum = Math.round(periodPaymentsSum * 100) / 100;

    // System Total Collections = Beginning + Collections during period (as in Samaria BMS)
    const totalCollections = Math.round((systemBeginning + periodCollectionsSum) * 100) / 100;
    const totalPayments = periodPaymentsSum;
    const systemEnding = Math.round((totalCollections - totalPayments) * 100) / 100;

    return NextResponse.json({
      success: true,
      data: {
        bankAccount: {
          id: bankAccount.id,
          bankName: bankAccount.bankName,
          accountNo: bankAccount.accountNo,
          accountName: bankAccount.accountName,
          currentBalance: bankAccount.balance,
        },
        periodFrom,
        periodTo,
        systemBeginning,
        periodCollectionsSum,
        periodPaymentsSum,
        totalCollections,
        totalPayments,
        systemEnding,
        transactions,
      },
    });
  } catch (error: any) {
    console.error('Error fetching reconciliation preview:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
