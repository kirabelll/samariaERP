import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getVoucherTypeInfo(refModule?: string | null, voucherNo?: string | null) {
  const mod = (refModule || '').toUpperCase();
  const vNo = voucherNo || '';

  if (mod === 'SALES_INVOICE' || vNo.startsWith('INV-')) {
    return { voucherType: 'Sales Invoice', voucherSubtype: 'Customer Invoice' };
  }
  if (mod === 'CEMENT_PURCHASE' || vNo.startsWith('PUR-') || vNo.startsWith('CP-')) {
    return { voucherType: 'Purchase Invoice', voucherSubtype: 'Cement Purchase' };
  }
  if (mod === 'CEMENT_LIFTING' || vNo.startsWith('LIF-')) {
    return { voucherType: 'Stock Entry', voucherSubtype: 'Cement Lifting' };
  }
  if (mod === 'SUPPLIER_PAYMENT' || vNo.startsWith('SP-') || vNo.startsWith('PAY-')) {
    return { voucherType: 'Supplier Payment', voucherSubtype: 'Payment Entry' };
  }
  if (mod === 'CUSTOMER_PAYMENT' || vNo.startsWith('REC-') || vNo.startsWith('CR-')) {
    return { voucherType: 'Customer Payment', voucherSubtype: 'Receipt Entry' };
  }
  if (mod === 'VOUCHER' || mod === 'PAYMENT_VOUCHER' || vNo.startsWith('PV-') || vNo.startsWith('RV-')) {
    return { voucherType: 'Payment Voucher', voucherSubtype: 'Voucher Entry' };
  }
  if (mod === 'PAYROLL' || vNo.startsWith('PAYROLL-')) {
    return { voucherType: 'Payroll', voucherSubtype: 'Salary Entry' };
  }
  if (mod === 'BANK_DEPOSIT' || mod === 'BANK_TRANSACTION_DEPOSIT' || vNo.startsWith('DEP-')) {
    return { voucherType: 'Bank Deposit', voucherSubtype: 'Banking Entry' };
  }
  if (mod === 'BANK_WITHDRAWAL' || mod === 'BANK_TRANSACTION_WITHDRAWAL' || vNo.startsWith('WDL-')) {
    return { voucherType: 'Bank Withdrawal', voucherSubtype: 'Banking Entry' };
  }
  if (mod === 'BANK_TRANSFER' || vNo.startsWith('TRF-')) {
    return { voucherType: 'Bank Transfer', voucherSubtype: 'Interbank Transfer' };
  }
  return { voucherType: 'Journal Entry', voucherSubtype: 'Journal Voucher' };
}

function isInitialBalanceEntry(entry: { refModule?: string | null; voucherNo?: string | null; description?: string | null }): boolean {
  const mod = (entry.refModule || '').toUpperCase().trim();
  const vNo = (entry.voucherNo || '').toUpperCase().trim();
  const desc = (entry.description || '').toUpperCase().trim();

  if (
    mod === 'INITIAL BALANCE' ||
    mod === 'INITIAL_BALANCE' ||
    mod === 'INITIAL' ||
    mod === 'OPENING BALANCE' ||
    mod === 'OPENING_BALANCE' ||
    mod === 'OPENING'
  ) {
    return true;
  }
  if (mod.includes('INITIAL') || mod.includes('OPENING')) {
    return true;
  }
  if (vNo.startsWith('INIT-') || vNo.startsWith('OPEN-') || vNo.startsWith('OB-')) {
    return true;
  }
  if (desc.startsWith('INITIAL OPENING') || desc.startsWith('OPENING BALANCE') || desc === 'INITIAL BALANCE') {
    return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId') || '';
    const accountCode = searchParams.get('accountCode') || '';
    const fromDateParam = searchParams.get('fromDate') || searchParams.get('startDate') || '';
    const toDateParam = searchParams.get('toDate') || searchParams.get('endDate') || '';
    const voucherTypeFilter = searchParams.get('voucherType') || '';
    const voucherNoSearch = searchParams.get('voucherNo') || searchParams.get('search') || '';
    const partyFilter = searchParams.get('party') || '';

    // Fetch accounts list for filter dropdown
    const accounts = await prisma.chartOfAccount.findMany({
      orderBy: { accountCode: 'asc' },
    });

    // Resolve target account if provided
    let targetAccount: any = null;
    if (accountId) {
      targetAccount = accounts.find((a) => a.id === accountId);
    } else if (accountCode) {
      const cleanTargetCode = accountCode.trim().replace(/^1020-/, '');
      targetAccount = accounts.find(
        (a) =>
          a.accountCode === accountCode ||
          a.accountCode === `1020-${cleanTargetCode}` ||
          a.accountCode.includes(cleanTargetCode) ||
          a.accountName.toLowerCase().includes(accountCode.toLowerCase())
      );
    }

    // Determine date ranges
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (fromDateParam) {
      fromDate = new Date(fromDateParam);
      fromDate.setHours(0, 0, 0, 0);
    }
    if (toDateParam) {
      toDate = new Date(toDateParam);
      toDate.setHours(23, 59, 59, 999);
    }

    // 1. Calculate Opening Balances per account:
    // Map accountId -> { debit, credit, balance, balanceType }
    const accountOpeningBalances: Record<string, { debit: number; credit: number; balance: number; balanceType: 'Dr' | 'Cr' }> = {};

    for (const acc of accounts) {
      const isDebitNormal = acc.accountType === 'Asset' || acc.accountType === 'Expense';
      accountOpeningBalances[acc.id] = {
        debit: 0,
        credit: 0,
        balance: 0,
        balanceType: isDebitNormal ? 'Dr' : 'Cr',
      };
    }

    // Fetch prior entries before fromDate
    if (fromDate) {
      const openingSums = await prisma.journalEntry.groupBy({
        by: ['accountId'],
        where: {
          entryDate: { lt: fromDate },
          ...(targetAccount ? { accountId: targetAccount.id } : {}),
        },
        _sum: {
          debit: true,
          credit: true,
        },
      });

      for (const s of openingSums) {
        if (accountOpeningBalances[s.accountId]) {
          accountOpeningBalances[s.accountId].debit += Number(s._sum.debit) || 0;
          accountOpeningBalances[s.accountId].credit += Number(s._sum.credit) || 0;
        }
      }
    }

    // 2. Fetch Journal Entries for the period (or all if no date filter)
    const whereClause: any = {};
    if (targetAccount) {
      whereClause.accountId = targetAccount.id;
    }
    if (fromDate || toDate) {
      whereClause.entryDate = {};
      if (fromDate) whereClause.entryDate.gte = fromDate;
      if (toDate) whereClause.entryDate.lte = toDate;
    }
    if (voucherNoSearch) {
      whereClause.OR = [
        { voucherNo: { contains: voucherNoSearch, mode: 'insensitive' } },
        { description: { contains: voucherNoSearch, mode: 'insensitive' } },
        { refId: { contains: voucherNoSearch, mode: 'insensitive' } },
        { account: { accountCode: { contains: voucherNoSearch, mode: 'insensitive' } } },
        { account: { accountName: { contains: voucherNoSearch, mode: 'insensitive' } } },
      ];
    }

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    const rawEntries = await prisma.journalEntry.findMany({
      where: whereClause,
      include: {
        account: true,
      },
      orderBy: [{ entryDate: 'asc' }, { id: 'asc' }],
    });

    // When fromDate is active, separate prior initial balances into opening. When viewing all, show all rows.
    const regularEntries: any[] = [];

    for (const entry of rawEntries) {
      if (fromDate && isInitialBalanceEntry(entry)) {
        // Absorb into this account's Opening Balance
        if (accountOpeningBalances[entry.accountId]) {
          accountOpeningBalances[entry.accountId].debit += Number(entry.debit) || 0;
          accountOpeningBalances[entry.accountId].credit += Number(entry.credit) || 0;
        }
      } else {
        regularEntries.push(entry);
      }
    }

    // Calculate opening balance amount for each account based on its account type
    let totalOpeningDebit = 0;
    let totalOpeningCredit = 0;

    for (const acc of accounts) {
      const ob = accountOpeningBalances[acc.id];
      if (ob) {
        totalOpeningDebit += ob.debit;
        totalOpeningCredit += ob.credit;

        const isDebitNormal = acc.accountType === 'Asset' || acc.accountType === 'Expense';
        if (isDebitNormal) {
          ob.balance = ob.debit - ob.credit;
          ob.balanceType = ob.balance >= 0 ? 'Dr' : 'Cr';
        } else {
          ob.balance = ob.credit - ob.debit;
          ob.balanceType = ob.balance >= 0 ? 'Cr' : 'Dr';
        }
      }
    }

    // Overall opening balance for the report header/opening row
    let openingDebit = 0;
    let openingCredit = 0;
    let openingBalance = 0;
    let openingBalanceType: 'Dr' | 'Cr' = 'Dr';

    if (targetAccount) {
      const ob = accountOpeningBalances[targetAccount.id];
      openingDebit = ob?.debit || 0;
      openingCredit = ob?.credit || 0;
      openingBalance = ob?.balance || 0;
      openingBalanceType = ob?.balanceType || 'Dr';
    } else {
      openingDebit = totalOpeningDebit;
      openingCredit = totalOpeningCredit;
      openingBalance = totalOpeningDebit - totalOpeningCredit;
      openingBalanceType = openingBalance >= 0 ? 'Dr' : 'Cr';
    }

    const entries = regularEntries;

    // 3. Find Against Accounts: fetch sibling lines for all unique voucher numbers
    const voucherNumbers = Array.from(new Set(entries.map((e) => e.voucherNo)));
    const siblingEntries = await prisma.journalEntry.findMany({
      where: {
        voucherNo: { in: voucherNumbers },
      },
      include: {
        account: { select: { id: true, accountCode: true, accountName: true } },
      },
    });

    // Map voucherNo -> opposite accounts
    const voucherAccountsMap: Record<string, Record<string, string[]>> = {};
    for (const s of siblingEntries) {
      if (!voucherAccountsMap[s.voucherNo]) {
        voucherAccountsMap[s.voucherNo] = {};
      }
      const side = s.debit > 0 ? 'debit' : 'credit';
      if (!voucherAccountsMap[s.voucherNo][side]) {
        voucherAccountsMap[s.voucherNo][side] = [];
      }
      const label = `${s.account.accountCode} - ${s.account.accountName}`;
      if (!voucherAccountsMap[s.voucherNo][side].includes(label)) {
        voucherAccountsMap[s.voucherNo][side].push(label);
      }
    }

    // 4. Calculate Running Balances per Account and Format Transactions
    const runningBalanceByAccount: Record<string, number> = {};
    for (const acc of accounts) {
      runningBalanceByAccount[acc.id] = accountOpeningBalances[acc.id]?.balance || 0;
    }

    let totalDebit = 0;
    let totalCredit = 0;

    const formattedTransactions = entries.map((entry: any, index: number) => {
      const debit = Number(entry.debit) || 0;
      const credit = Number(entry.credit) || 0;
      totalDebit += debit;
      totalCredit += credit;

      const acc = entry.account || accountMap.get(entry.accountId);
      const isDebitNormal = !acc || acc.accountType === 'Asset' || acc.accountType === 'Expense';

      // Update THIS specific account's running balance
      let currentBal = runningBalanceByAccount[entry.accountId] ?? 0;
      if (isDebitNormal) {
        currentBal += debit - credit;
      } else {
        currentBal += credit - debit;
      }
      runningBalanceByAccount[entry.accountId] = currentBal;

      const runningBalance = currentBal;
      const balanceType = isDebitNormal
        ? (runningBalance >= 0 ? 'Dr' : 'Cr')
        : (runningBalance >= 0 ? 'Cr' : 'Dr');

      // Determine against account (the opposite side)
      const mySide = debit > 0 ? 'debit' : 'credit';
      const oppositeSide = mySide === 'debit' ? 'credit' : 'debit';
      const oppositeList = voucherAccountsMap[entry.voucherNo]?.[oppositeSide] || [];
      const againstAccount = oppositeList.length > 0 ? oppositeList.join(', ') : '-';

      const typeInfo = getVoucherTypeInfo(entry.refModule, entry.voucherNo);

      // Extract party from description if present
      let party = '-';
      if (entry.description) {
        const parts = entry.description.split('—');
        if (parts.length > 1) {
          party = parts[1].trim();
        }
      }

      return {
        id: entry.id,
        index: index + 1,
        postingDate: entry.entryDate,
        accountId: entry.accountId,
        accountCode: acc?.accountCode || '',
        accountName: acc?.accountName || '',
        accountType: acc?.accountType || 'Asset',
        debit,
        credit,
        runningBalance,
        balanceType,
        voucherType: typeInfo.voucherType,
        voucherSubtype: typeInfo.voucherSubtype,
        voucherNo: entry.voucherNo,
        againstAccount,
        party,
        description: entry.description || '',
        refModule: entry.refModule || '',
        refId: entry.refId || '',
        postedBy: entry.postedBy || '',
      };
    });

    // Filter by voucher type if requested
    let finalTransactions = formattedTransactions;
    if (voucherTypeFilter) {
      finalTransactions = finalTransactions.filter(
        (t) => t.voucherType.toLowerCase() === voucherTypeFilter.toLowerCase()
      );
    }
    if (partyFilter) {
      finalTransactions = finalTransactions.filter(
        (t) =>
          t.party.toLowerCase().includes(partyFilter.toLowerCase()) ||
          t.description.toLowerCase().includes(partyFilter.toLowerCase())
      );
    }

    const netPeriodMovement = totalDebit - totalCredit;
    const closingBalance = targetAccount
      ? (runningBalanceByAccount[targetAccount.id] ?? openingBalance)
      : (openingBalance + netPeriodMovement);

    const closingBalanceType = targetAccount
      ? (targetAccount.accountType === 'Liability' || targetAccount.accountType === 'Equity' || targetAccount.accountType === 'Revenue')
        ? (closingBalance >= 0 ? 'Cr' : 'Dr')
        : (closingBalance >= 0 ? 'Dr' : 'Cr')
      : (closingBalance >= 0 ? 'Dr' : 'Cr');

    return NextResponse.json({
      success: true,
      data: {
        account: targetAccount,
        accounts,
        opening: {
          debit: openingDebit,
          credit: openingCredit,
          balance: openingBalance,
          balanceType: openingBalanceType,
        },
        transactions: finalTransactions,
        summary: {
          totalDebit,
          totalCredit,
          netPeriodMovement,
          closingBalance,
          closingBalanceType,
          transactionCount: finalTransactions.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching general ledger:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
