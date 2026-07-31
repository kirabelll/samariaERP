import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Auto-populate reconciliation items from posted payment vouchers.
 * Creates ReconciliationItem for each voucher in the period that hasn't been reconciled yet.
 */
async function autopopulateReconciliationItems(
  reconciliationId: string,
  bankAccountId: string,
  periodFrom: Date,
  periodTo: Date
) {
  try {
    // Query all posted payment vouchers for the period with matching bank account
    const vouchers = await prisma.paymentVoucher.findMany({
      where: {
        bankAccountId,
        status: 'Posted',
        postedAt: {
          gte: periodFrom,
          lte: periodTo,
        },
      },
    });

    // Create ReconciliationItem for each voucher
    const items = await Promise.all(
      vouchers.map((voucher) =>
        prisma.reconciliationItem.create({
          data: {
            reconciliationId,
            description: voucher.description || `${voucher.voucherType} - ${voucher.voucherNo}`,
            bookAmount: voucher.amount,
            bankAmount: 0,
            status: 'Unreconciled',
            transactionId: voucher.id,
          },
        })
      )
    );

    return { success: true, itemsCreated: items.length, items };
  } catch (error: any) {
    console.warn(`Auto-populate reconciliation items failed:`, error.message);
    return { success: false, reason: error.message };
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const bankAccountId = searchParams.get('bankAccountId') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (bankAccountId) {
      whereClause.bankAccountId = bankAccountId;
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.bankReconciliation.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          bankAccount: true,
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bankReconciliation.count({ where: whereClause }),
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
    console.error('Error fetching bank reconciliations:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bankAccountId,
      periodFrom,
      periodTo,
      openingBalance,
      closingBalance,
      bankStatement,
      difference,
    } = body;

    // Validate required fields
    if (!bankAccountId || !periodFrom || !periodTo) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate reconNo
    const count = await prisma.bankReconciliation.count();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const reconNo = `REC-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const periodFromDate = new Date(periodFrom);
    const periodToDate = new Date(periodTo);

    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        bankAccountId,
        periodFrom: periodFromDate,
        periodTo: periodToDate,
        openingBalance: openingBalance || 0,
        closingBalance: closingBalance || 0,
        bankStatement: bankStatement || 0,
        difference: difference || 0,
        status: 'Draft',
      },
      include: {
        bankAccount: true,
        items: true,
      },
    });

    // Auto-populate reconciliation items from posted vouchers
    const autopopulateResult = await autopopulateReconciliationItems(
      reconciliation.id,
      bankAccountId,
      periodFromDate,
      periodToDate
    );

    // Re-fetch reconciliation with populated items
    const reconciliationWithItems = await prisma.bankReconciliation.findUnique({
      where: { id: reconciliation.id },
      include: {
        bankAccount: true,
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: reconciliationWithItems,
      autopopulate: autopopulateResult,
    });
  } catch (error: any) {
    console.error('Error creating bank reconciliation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
