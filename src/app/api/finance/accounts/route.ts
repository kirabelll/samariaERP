import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CHART_OF_ACCOUNTS_SEED } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';
    const accountType = searchParams.get('accountType') || '';

    // Fetch company name setting if available
    const companySetting = await prisma.systemSetting.findUnique({
      where: { key: 'company_name' },
    });
    const companyName = companySetting?.value || 'Samaria Trading PLC';

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { accountCode: { contains: search, mode: 'insensitive' } },
        { accountName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (accountType) {
      whereClause.accountType = accountType;
    }

    // Always fetch all accounts to calculate complete tree and rollups
    const allAccounts = await prisma.chartOfAccount.findMany({
      orderBy: { accountCode: 'asc' },
    });

    // Aggregate debit/credit sums from journal entries
    const journalSums = await prisma.journalEntry.groupBy({
      by: ['accountId'],
      _sum: {
        debit: true,
        credit: true,
      },
      _count: {
        id: true,
      },
    });

    const sumMap: Record<string, { debit: number; credit: number; count: number }> = {};
    for (const j of journalSums) {
      sumMap[j.accountId] = {
        debit: Number(j._sum.debit) || 0,
        credit: Number(j._sum.credit) || 0,
        count: j._count.id || 0,
      };
    }

    // Map accounts with initial direct transaction balances
    interface AccountWithBalance {
      id: string;
      accountCode: string;
      accountName: string;
      accountType: string;
      parentId: string | null;
      isActive: boolean;
      totalDebit: number;
      totalCredit: number;
      balance: number;
      balanceType: 'Dr' | 'Cr';
      signedBalance: number;
      transactionCount: number;
      isGroup: boolean;
      children?: AccountWithBalance[];
    }

    // Build child map to determine which accounts are groups
    const parentIdSet = new Set<string>();
    for (const a of allAccounts) {
      if (a.parentId) parentIdSet.add(a.parentId);
    }

    const accountsMap: Record<string, AccountWithBalance> = {};
    for (const a of allAccounts) {
      const sum = sumMap[a.id] || { debit: 0, credit: 0, count: 0 };
      const isGroup = parentIdSet.has(a.id);

      // Normal balance calculation:
      // Asset & Expense: Normal Debit (Debit - Credit)
      // Liability, Equity, Revenue: Normal Credit (Credit - Debit)
      let signedBalance = 0;
      let balanceType: 'Dr' | 'Cr' = 'Dr';

      if (a.accountType === 'Asset' || a.accountType === 'Expense') {
        signedBalance = sum.debit - sum.credit;
        balanceType = signedBalance >= 0 ? 'Dr' : 'Cr';
      } else {
        signedBalance = sum.credit - sum.debit;
        balanceType = signedBalance >= 0 ? 'Cr' : 'Dr';
      }

      accountsMap[a.id] = {
        id: a.id,
        accountCode: a.accountCode,
        accountName: a.accountName,
        accountType: a.accountType,
        parentId: a.parentId,
        isActive: a.isActive,
        totalDebit: sum.debit,
        totalCredit: sum.credit,
        balance: Math.abs(signedBalance),
        balanceType,
        signedBalance,
        transactionCount: sum.count,
        isGroup,
        children: [],
      };
    }

    // Build hierarchy and rollup balances recursively
    const rootNodes: AccountWithBalance[] = [];
    const directChildrenMap: Record<string, AccountWithBalance[]> = {};

    for (const a of allAccounts) {
      const node = accountsMap[a.id];
      if (node.parentId && accountsMap[node.parentId]) {
        if (!directChildrenMap[node.parentId]) {
          directChildrenMap[node.parentId] = [];
        }
        directChildrenMap[node.parentId].push(node);
      } else {
        rootNodes.push(node);
      }
    }

    // Recursive rollup of balances
    const rollupNode = (node: AccountWithBalance): { totalDebit: number; totalCredit: number; count: number } => {
      const children = directChildrenMap[node.id] || [];
      node.children = children;

      let subDebit = node.totalDebit;
      let subCredit = node.totalCredit;
      let subCount = node.transactionCount;

      for (const child of children) {
        const childRollup = rollupNode(child);
        subDebit += childRollup.totalDebit;
        subCredit += childRollup.totalCredit;
        subCount += childRollup.count;
      }

      if (node.isGroup) {
        node.totalDebit = subDebit;
        node.totalCredit = subCredit;
        node.transactionCount = subCount;

        if (node.accountType === 'Asset' || node.accountType === 'Expense') {
          const net = subDebit - subCredit;
          node.signedBalance = net;
          node.balance = Math.abs(net);
          node.balanceType = net >= 0 ? 'Dr' : 'Cr';
        } else {
          const net = subCredit - subDebit;
          node.signedBalance = net;
          node.balance = Math.abs(net);
          node.balanceType = net >= 0 ? 'Cr' : 'Dr';
        }
      }

      return { totalDebit: subDebit, totalCredit: subCredit, count: subCount };
    };

    for (const root of rootNodes) {
      rollupNode(root);
    }

    // Format flat list
    const enrichedList = Object.values(accountsMap);

    // Apply filtering for flat list / pagination
    let filteredList = enrichedList;
    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredList = filteredList.filter(
        (a) =>
          a.accountCode.toLowerCase().includes(lowerSearch) ||
          a.accountName.toLowerCase().includes(lowerSearch)
      );
    }
    if (accountType) {
      filteredList = filteredList.filter((a) => a.accountType === accountType);
    }

    const total = filteredList.length;
    const skip = (page - 1) * limit;
    const paginatedData = limit >= 1000 ? filteredList : filteredList.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      companyName,
      data: paginatedData,
      allAccounts: enrichedList,
      tree: rootNodes,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/accounts — Seed/upsert Chart of Accounts with standard accounts.
 * Safe to call multiple times — uses upsert so existing accounts are not duplicated.
 */
export async function PUT(request: NextRequest) {
  try {
    const results: string[] = [];

    // First pass: create parent accounts (those without parentCode)
    const parentAccounts = CHART_OF_ACCOUNTS_SEED.filter((a) => !('parentCode' in a) || !a.parentCode);
    for (const acct of parentAccounts) {
      await prisma.chartOfAccount.upsert({
        where: { accountCode: acct.accountCode },
        update: { accountName: acct.accountName, accountType: acct.accountType, isActive: true },
        create: { accountCode: acct.accountCode, accountName: acct.accountName, accountType: acct.accountType, isActive: true },
      });
      results.push(`${acct.accountCode} ${acct.accountName}`);
    }

    // Second pass: create child accounts with parent references
    const childAccounts = CHART_OF_ACCOUNTS_SEED.filter((a) => 'parentCode' in a && a.parentCode);
    for (const acct of childAccounts) {
      const parent = await prisma.chartOfAccount.findFirst({ where: { accountCode: (acct as any).parentCode } });
      await prisma.chartOfAccount.upsert({
        where: { accountCode: acct.accountCode },
        update: { accountName: acct.accountName, accountType: acct.accountType, parentId: parent?.id || null, isActive: true },
        create: { accountCode: acct.accountCode, accountName: acct.accountName, accountType: acct.accountType, parentId: parent?.id || null, isActive: true },
      });
      results.push(`${acct.accountCode} ${acct.accountName}`);
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.length} accounts`,
      accounts: results,
    });
  } catch (error: any) {
    console.error('Error seeding chart of accounts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountCode, accountName, accountType, parentId } = body;

    if (!accountCode || !accountName || !accountType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: accountCode, accountName, accountType' },
        { status: 400 }
      );
    }

    const existingAccount = await prisma.chartOfAccount.findUnique({
      where: { accountCode },
    });

    if (existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Account code already exists' },
        { status: 400 }
      );
    }

    const account = await prisma.chartOfAccount.create({
      data: {
        accountCode,
        accountName,
        accountType,
        parentId: parentId || null,
        isActive: true,
      },
    });

    return NextResponse.json(
      { success: true, data: account },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
