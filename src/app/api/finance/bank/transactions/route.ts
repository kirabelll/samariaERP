import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';
import { journalBankTransaction, journalBankTransfer } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

/**
 * GET /api/finance/bank/transactions
 * List bank transactions with optional filters.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const bankAccountId = searchParams.get('bankAccountId') || '';
    const type = searchParams.get('type') || '';
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;
    const whereClause: any = {};

    if (bankAccountId) whereClause.bankAccountId = bankAccountId;
    if (type) whereClause.type = type;
    if (search) {
      whereClause.OR = [
        { refNo: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          bankAccount: {
            select: { id: true, bankName: true, accountNo: true, accountName: true },
          },
        },
        orderBy: { transDate: 'desc' },
      }),
      prisma.bankTransaction.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('Error fetching bank transactions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/bank/transactions
 * Create a new bank transaction.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankAccountId, type, amount, refNo, description, transDate, refModule, refId, createdBy, destinationBankAccountId } = body;

    if (!bankAccountId || !type || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: bankAccountId, type, amount' },
        { status: 400 }
      );
    }

    const txnAmount = parseFloat(amount);

    // ---------- TRANSFER ----------
    if (type === 'transfer') {
      if (!destinationBankAccountId) {
        return NextResponse.json(
          { success: false, error: 'Missing required field: destinationBankAccountId' },
          { status: 400 }
        );
      }

      if (bankAccountId === destinationBankAccountId) {
        return NextResponse.json(
          { success: false, error: 'Source and destination accounts must be different' },
          { status: 400 }
        );
      }

      // Verify both accounts exist and are Active
      const [sourceAccount, destAccount] = await Promise.all([
        prisma.bankAccount.findUnique({ where: { id: bankAccountId } }),
        prisma.bankAccount.findUnique({ where: { id: destinationBankAccountId } }),
      ]);

      if (!sourceAccount) {
        return NextResponse.json(
          { success: false, error: 'Source bank account not found' },
          { status: 404 }
        );
      }
      if (!destAccount) {
        return NextResponse.json(
          { success: false, error: 'Destination bank account not found' },
          { status: 404 }
        );
      }
      if (sourceAccount.status !== 'Active') {
        return NextResponse.json(
          { success: false, error: 'Source bank account is not Active' },
          { status: 400 }
        );
      }
      if (destAccount.status !== 'Active') {
        return NextResponse.json(
          { success: false, error: 'Destination bank account is not Active' },
          { status: 400 }
        );
      }

      // Validate sufficient balance
      if (sourceAccount.balance < txnAmount) {
        return NextResponse.json(
          { success: false, error: `Insufficient balance. Available: ETB ${sourceAccount.balance.toLocaleString('en-US')}` },
          { status: 400 }
        );
      }

      // Generate a shared reference number for both legs
      const transferRefNo = refNo || `TRF-${Date.now()}`;
      const transferDate = transDate ? new Date(transDate) : new Date();
      const transferDesc = description || `Bank transfer from ${sourceAccount.bankName} (${sourceAccount.accountNo}) to ${destAccount.bankName} (${destAccount.accountNo})`;

      // Atomic transaction: create both records and update both balances
      const result = await prisma.$transaction(async (tx) => {
        const withdrawalTxn = await tx.bankTransaction.create({
          data: {
            bankAccountId,
            type: 'withdrawal',
            amount: txnAmount,
            refNo: transferRefNo,
            description: transferDesc,
            refModule: 'BANK_TRANSFER',
            refId: refId || null,
            transDate: transferDate,
            reconStatus: 'Pending',
            createdBy: createdBy || null,
          },
          include: {
            bankAccount: {
              select: { id: true, bankName: true, accountNo: true, accountName: true },
            },
          },
        });

        const depositTxn = await tx.bankTransaction.create({
          data: {
            bankAccountId: destinationBankAccountId,
            type: 'deposit',
            amount: txnAmount,
            refNo: transferRefNo,
            description: transferDesc,
            refModule: 'BANK_TRANSFER',
            refId: refId || null,
            transDate: transferDate,
            reconStatus: 'Pending',
            createdBy: createdBy || null,
          },
          include: {
            bankAccount: {
              select: { id: true, bankName: true, accountNo: true, accountName: true },
            },
          },
        });

        // Update both account balances
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { balance: { decrement: txnAmount } },
        });

        await tx.bankAccount.update({
          where: { id: destinationBankAccountId },
          data: { balance: { increment: txnAmount } },
        });

        return { withdrawal: withdrawalTxn, deposit: depositTxn };
      });

      // Post auto-journal for transfer: Debit Dest Bank sub-account, Credit Source Bank sub-account
      try {
        await journalBankTransfer({
          sourceBankAccountId: bankAccountId,
          destinationBankAccountId,
          amount: txnAmount,
          refNo: transferRefNo,
          description: transferDesc,
          refId: result.withdrawal.id,
          createdBy,
        });
      } catch (jErr) {
        console.warn('Auto-journal for bank transfer failed:', jErr);
      }

      return NextResponse.json(
        { success: true, data: result },
        { status: 201 }
      );
    }

    // ---------- DEPOSIT / WITHDRAWAL ----------
    // Verify bank account exists
    const bankAccount = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bankAccount) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    const transaction = await prisma.bankTransaction.create({
      data: {
        bankAccountId,
        type,
        amount: txnAmount,
        refNo: refNo || null,
        description: description || null,
        refModule: refModule || null,
        refId: refId || null,
        transDate: transDate ? new Date(transDate) : new Date(),
        reconStatus: 'Pending',
        createdBy: createdBy || null,
      },
      include: {
        bankAccount: {
          select: { id: true, bankName: true, accountNo: true, accountName: true },
        },
      },
    });

    // Update bank account balance
    if (type === 'deposit') {
      await prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { balance: { increment: txnAmount } },
      });
    } else if (type === 'withdrawal') {
      await prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { balance: { decrement: txnAmount } },
      });
    }

    // Auto-create double-entry journal for deposit / withdrawal
    try {
      await journalBankTransaction(transaction);
    } catch (jErr) {
      console.warn('Auto-journal for bank transaction failed:', jErr);
    }

    // Auto-settle aggregate deliveries when bank payment is made
    if (refModule === 'AGGREGATE_SETTLEMENT' && refId) {
      try {
        const deliveryIds = refId.split(',').map((id: string) => id.trim()).filter(Boolean);
        if (deliveryIds.length > 0) {
          await prisma.aggregateDelivery.updateMany({
            where: {
              id: { in: deliveryIds },
              status: 'Verified',
            },
            data: { status: 'Settled' },
          });

          notify({
            module: 'AGGREGATE',
            event: 'aggregate_bulk_settled',
            details: {
              method: 'Bank Transaction',
              bankAccount: `${transaction.bankAccount?.bankName} — ${transaction.bankAccount?.accountNo}`,
              deliveryCount: `${deliveryIds.length} deliveries`,
              totalAmount: `ETB ${txnAmount.toLocaleString('en-US')}`,
            },
          });
        }
      } catch (settleErr) {
        console.error('Failed to auto-settle aggregate deliveries:', settleErr);
      }
    }

    return NextResponse.json(
      { success: true, data: transaction },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating bank transaction:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
