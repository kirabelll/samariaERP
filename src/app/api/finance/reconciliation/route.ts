import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
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
      status,
      items,
      reconciledBy,
    } = body;

    // Validate required fields
    if (!bankAccountId || !periodFrom || !periodTo) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: bankAccountId, periodFrom, periodTo' },
        { status: 400 }
      );
    }

    const periodFromDate = new Date(periodFrom);
    const periodToDate = new Date(periodTo);
    const diff = Number(difference ?? ((closingBalance || 0) - (bankStatement || 0)));

    const reconciliationStatus = status || (Math.abs(diff) < 0.01 ? 'Reconciled' : 'Draft');

    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        bankAccountId,
        periodFrom: periodFromDate,
        periodTo: periodToDate,
        openingBalance: Number(openingBalance) || 0,
        closingBalance: Number(closingBalance) || 0,
        bankStatement: Number(bankStatement) || 0,
        difference: Math.round(diff * 100) / 100,
        status: reconciliationStatus,
        reconciledBy: reconciledBy || null,
        reconciledAt: reconciliationStatus === 'Reconciled' ? new Date() : null,
      },
    });

    // Save items if provided
    if (Array.isArray(items) && items.length > 0) {
      await prisma.reconciliationItem.createMany({
        data: items.map((item: any) => ({
          reconciliationId: reconciliation.id,
          description: item.description || '',
          bookAmount: Number(item.bookAmount) || 0,
          bankAmount: Number(item.bankAmount) || 0,
          difference: Number(item.difference) || 0,
          status: item.status || 'Matched',
          transactionId: item.transactionId || null,
        })),
      });
    }

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
    });
  } catch (error: any) {
    console.error('Error creating bank reconciliation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
