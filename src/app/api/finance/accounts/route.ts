import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CHART_OF_ACCOUNTS_SEED } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const accountType = searchParams.get('accountType') || '';

    const skip = (page - 1) * limit;

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

    const [data, total] = await Promise.all([
      prisma.chartOfAccount.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { accountCode: 'asc' },
      }),
      prisma.chartOfAccount.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
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
