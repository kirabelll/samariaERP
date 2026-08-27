import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/finance/reconciliation/transactions
 * Queries all transactions (PaymentVouchers, BankTransactions) for a bank account in a date range,
 * calculates opening book balance, period deposits & withdrawals, closing book balance,
 * reconciled/cleared amounts, bank statement difference, and provides full transaction breakdown.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bankAccountId = searchParams.get('bankAccountId');
    const periodFromStr = searchParams.get('periodFrom');
    const periodToStr = searchParams.get('periodTo');
    const bankStatementStr = searchParams.get('bankStatement') || '0';

    if (!bankAccountId) {
      return NextResponse.json(
        { success: false, error: 'bankAccountId is required' },
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

    const periodFrom = periodFromStr ? new Date(`${periodFromStr}T00:00:00.000Z`) : new Date(0);
    const periodTo = periodToStr ? new Date(`${periodToStr}T23:59:59.999Z`) : new Date();
    const bankStatement = parseFloat(bankStatementStr) || 0;

    // 1. Fetch prior transactions to calculate Opening Book Balance
    const [priorVouchers, priorBankTxns] = await Promise.all([
      prisma.paymentVoucher.findMany({
        where: {
          bankAccountId,
          status: { in: ['Posted', 'Approved', 'Paid'] },
          voucherDate: { lt: periodFrom },
        },
        select: { voucherType: true, amount: true },
      }),
      prisma.bankTransaction.findMany({
        where: {
          bankAccountId,
          transDate: { lt: periodFrom },
        },
        select: { type: true, amount: true },
      }),
    ]);

    let calculatedPriorBalance = 0;
    priorVouchers.forEach((v) => {
      if (v.voucherType === 'RECEIPT') calculatedPriorBalance += Number(v.amount || 0);
      else calculatedPriorBalance -= Number(v.amount || 0);
    });
    priorBankTxns.forEach((t) => {
      if (t.type === 'deposit') calculatedPriorBalance += Number(t.amount || 0);
      else if (t.type === 'withdrawal') calculatedPriorBalance -= Number(t.amount || 0);
    });

    // 2. Fetch all period PaymentVouchers
    const periodVouchers = await prisma.paymentVoucher.findMany({
      where: {
        bankAccountId,
        status: { in: ['Posted', 'Approved', 'Paid', 'Pending'] },
        voucherDate: { gte: periodFrom, lte: periodTo },
      },
      orderBy: { voucherDate: 'asc' },
    });

    // 3. Fetch all period BankTransactions
    const periodBankTxns = await prisma.bankTransaction.findMany({
      where: {
        bankAccountId,
        transDate: { gte: periodFrom, lte: periodTo },
      },
      orderBy: { transDate: 'asc' },
    });

    // Check if there is an existing reconciliation draft / record for this period
    const existingRecon = await prisma.bankReconciliation.findFirst({
      where: {
        bankAccountId,
        periodFrom: { gte: new Date(`${periodFromStr}T00:00:00.000Z`) },
        periodTo: { lte: new Date(`${periodToStr}T23:59:59.999Z`) },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const reconciledTxnIds = new Set<string>();
    if (existingRecon?.items) {
      existingRecon.items.forEach((item) => {
        if (item.transactionId && (item.status === 'Matched' || item.status === 'Reconciled')) {
          reconciledTxnIds.add(item.transactionId);
        }
      });
    }

    // Build unified transactions list
    const transactions: Array<{
      id: string;
      source: 'VOUCHER' | 'BANK_TXN';
      date: string;
      refNo: string;
      description: string;
      party: string;
      type: 'DEPOSIT' | 'WITHDRAWAL';
      status: string;
      bookAmount: number;
      bankAmount: number;
      isReconciled: boolean;
      reconStatus: string;
    }> = [];

    const seenRefs = new Set<string>();

    periodVouchers.forEach((v) => {
      const isDeposit = v.voucherType === 'RECEIPT';
      const isRecon = reconciledTxnIds.has(v.id) || v.status === 'Posted';
      const refKey = v.voucherNo || v.refNo || v.id;
      seenRefs.add(refKey);

      transactions.push({
        id: v.id,
        source: 'VOUCHER',
        date: v.voucherDate.toISOString(),
        refNo: v.voucherNo || v.refNo || 'VOUCHER',
        description: v.description || `${v.voucherType} Payment Voucher`,
        party: v.payeeName || 'N/A',
        type: isDeposit ? 'DEPOSIT' : 'WITHDRAWAL',
        status: v.status,
        bookAmount: Number(v.amount || 0),
        bankAmount: Number(v.amount || 0),
        isReconciled: isRecon,
        reconStatus: isRecon ? 'Reconciled' : 'Unreconciled',
      });
    });

    periodBankTxns.forEach((t) => {
      const refKey = t.refNo || t.id;
      // If already added by voucher refNo, avoid double counting
      if (seenRefs.has(refKey)) return;

      const isDeposit = t.type === 'deposit';
      const isRecon = reconciledTxnIds.has(t.id) || t.reconStatus === 'Reconciled' || t.reconStatus === 'Matched';

      transactions.push({
        id: t.id,
        source: 'BANK_TXN',
        date: t.transDate.toISOString(),
        refNo: t.refNo || 'TXN',
        description: t.description || `Bank ${t.type}`,
        party: t.refModule || 'Bank Transaction',
        type: isDeposit ? 'DEPOSIT' : 'WITHDRAWAL',
        status: t.reconStatus || 'Completed',
        bookAmount: Number(t.amount || 0),
        bankAmount: Number(t.amount || 0),
        isReconciled: isRecon,
        reconStatus: isRecon ? 'Reconciled' : 'Unreconciled',
      });
    });

    // Sort all transactions by date ascending
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate Summary Metrics
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let clearedDeposits = 0;
    let unclearedDeposits = 0;
    let clearedWithdrawals = 0;
    let unclearedWithdrawals = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'DEPOSIT') {
        totalDeposits += tx.bookAmount;
        if (tx.isReconciled) clearedDeposits += tx.bookAmount;
        else unclearedDeposits += tx.bookAmount;
      } else {
        totalWithdrawals += tx.bookAmount;
        if (tx.isReconciled) clearedWithdrawals += tx.bookAmount;
        else unclearedWithdrawals += tx.bookAmount;
      }
    });

    const openingBalance = calculatedPriorBalance !== 0 ? calculatedPriorBalance : Number(bankAccount.balance || 0);
    const closingBookBalance = Number(bankAccount.balance || 0);
    const bookBalanceAsOfDate = openingBalance + totalDeposits - totalWithdrawals;

    // Reconciliation Formula:
    // Adjusted Book Balance = Closing Book Balance + Uncleared Deposits - Uncleared Withdrawals
    const adjustedBookBalance = closingBookBalance + unclearedDeposits - unclearedWithdrawals;
    const difference = closingBookBalance - bankStatement;
    const adjustedDifference = adjustedBookBalance - bankStatement;

    return NextResponse.json({
      success: true,
      bankAccount: {
        id: bankAccount.id,
        bankName: bankAccount.bankName,
        accountNo: bankAccount.accountNo,
        accountName: bankAccount.accountName,
        currentBalance: bankAccount.balance,
      },
      summary: {
        openingBalance,
        totalDeposits,
        totalWithdrawals,
        closingBookBalance,
        bookBalanceAsOfDate,
        clearedDeposits,
        unclearedDeposits,
        clearedWithdrawals,
        unclearedWithdrawals,
        bankStatement,
        adjustedBookBalance,
        difference,
        adjustedDifference,
        isBalanced: Math.abs(difference) < 0.01 || Math.abs(adjustedDifference) < 0.01,
      },
      transactions,
      existingReconciliation: existingRecon || null,
    });
  } catch (error: any) {
    console.error('Error calculating bank reconciliation transactions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
