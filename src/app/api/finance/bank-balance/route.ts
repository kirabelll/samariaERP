import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Returns all active bank accounts with balances and committed funds.
 * Supports ?accountId=<id> to get a specific account, or returns all active accounts.
 * For backward compatibility, also returns `data` with the first/default account.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const specificAccountId = searchParams.get('accountId') || '';

    // Fetch active bank accounts
    const whereClause: any = { status: 'Active' };
    if (specificAccountId) {
      whereClause.id = specificAccountId;
    }

    const accounts = await prisma.bankAccount.findMany({
      where: whereClause,
      select: {
        id: true,
        bankName: true,
        accountNo: true,
        accountName: true,
        balance: true,
        currency: true,
      },
      orderBy: { bankName: 'asc' },
    });

    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        accounts: [],
        message: 'No active bank accounts found.',
      });
    }

    // Get pending cement purchases (approved but not yet paid) to show committed funds
    const pendingPurchases = await prisma.cementPurchase.aggregate({
      where: {
        status: { in: ['Pending', 'Checked', 'Approved', 'Active'] },
        paymentStatus: { in: ['Unpaid', 'Partial'] },
      },
      _sum: { totalAmount: true, paidAmount: true },
    });

    const committedFunds = (Number(pendingPurchases._sum.totalAmount) || 0) - (Number(pendingPurchases._sum.paidAmount) || 0);

    // Enrich each account with committed/available info
    const enrichedAccounts = accounts.map((acc) => ({
      ...acc,
      balance: Number(acc.balance),
      committedFunds,
      availableBalance: Number(acc.balance) - committedFunds,
    }));

    // Default account: prefer CBE 1000639115554, otherwise first account
    const defaultAccount = enrichedAccounts.find((a) => a.accountNo === '1000639115554') || enrichedAccounts[0];

    return NextResponse.json({
      success: true,
      data: defaultAccount,       // backward compatible — single default account
      accounts: enrichedAccounts,  // NEW — all active accounts
    });
  } catch (error: any) {
    console.error('Error fetching bank balance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
