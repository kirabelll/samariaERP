import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CHART_OF_ACCOUNTS_SEED } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

/**
 * POST /api/system/seed — Seed Chart of Accounts (no auth required).
 * Safe to call multiple times — uses upsert.
 */
export async function POST(request: NextRequest) {
  try {
    const results: string[] = [];

    // First pass: parent accounts (no parentCode)
    const parents = CHART_OF_ACCOUNTS_SEED.filter((a) => !('parentCode' in a) || !(a as any).parentCode);
    for (const acct of parents) {
      await prisma.chartOfAccount.upsert({
        where: { accountCode: acct.accountCode },
        update: { accountName: acct.accountName, accountType: acct.accountType, isActive: true },
        create: { accountCode: acct.accountCode, accountName: acct.accountName, accountType: acct.accountType, isActive: true },
      });
      results.push(`${acct.accountCode} ${acct.accountName}`);
    }

    // Second pass: child accounts with parent links
    const children = CHART_OF_ACCOUNTS_SEED.filter((a) => 'parentCode' in a && (a as any).parentCode);
    for (const acct of children) {
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
    console.error('Error seeding accounts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
