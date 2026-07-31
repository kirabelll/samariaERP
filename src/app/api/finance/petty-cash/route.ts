import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { voucherNo: { contains: search, mode: 'insensitive' } },
        { cashierName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type) {
      whereClause.type = type;
    }
    if (status) {
      whereClause.status = status;
    }

    // Exclude cancelled records from normal listing
    if (!status) {
      whereClause.status = { not: 'Cancelled' };
    }

    const [data, total] = await Promise.all([
      prisma.pettyCash.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pettyCash.count({ where: whereClause }),
    ]);

    // Calculate summary (across all non-cancelled records, ignoring pagination)
    const summaryWhere: any = { status: { not: 'Cancelled' } };

    const [allocations, expenses, replenishments, returns] = await Promise.all([
      prisma.pettyCash.aggregate({
        where: { ...summaryWhere, type: 'FUND_ALLOCATION' },
        _sum: { amount: true },
      }),
      prisma.pettyCash.aggregate({
        where: { ...summaryWhere, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
      prisma.pettyCash.aggregate({
        where: { ...summaryWhere, type: 'REPLENISHMENT' },
        _sum: { amount: true },
      }),
      prisma.pettyCash.aggregate({
        where: { ...summaryWhere, type: 'RETURN' },
        _sum: { amount: true },
      }),
    ]);

    const totalAllocated = (allocations._sum.amount || 0) + (replenishments._sum.amount || 0);
    const totalExpenses = expenses._sum.amount || 0;
    const totalReturns = returns._sum.amount || 0;
    const currentBalance = totalAllocated - totalExpenses - totalReturns;

    return NextResponse.json({
      success: true,
      data,
      summary: {
        totalAllocated,
        totalExpenses,
        totalReturns,
        currentBalance,
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching petty cash records:', error);
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
      type,
      cashierId,
      cashierName,
      amount,
      category,
      description,
      refNo,
      bankAccountId,
      transactionDate,
      createdBy,
    } = body;

    // Validate required fields
    if (!type || !cashierName || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, cashierName, amount' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['FUND_ALLOCATION', 'EXPENSE', 'REPLENISHMENT', 'RETURN'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be one of: ' + validTypes.join(', ') },
        { status: 400 }
      );
    }

    // Bank account required for fund allocation
    if (type === 'FUND_ALLOCATION' && !bankAccountId) {
      return NextResponse.json(
        { success: false, error: 'Bank account is required for fund allocation' },
        { status: 400 }
      );
    }

    // Generate voucherNo using findFirst(orderBy desc) pattern
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const lastRecord = await prisma.pettyCash.findFirst({
      where: { voucherNo: { startsWith: 'PC-' } },
      orderBy: { voucherNo: 'desc' },
      select: { voucherNo: true },
    });
    let nextSeq = 1;
    if (lastRecord?.voucherNo) {
      const match = lastRecord.voucherNo.match(/(\d+)$/);
      if (match) nextSeq = parseInt(match[1]) + 1;
    }
    const voucherNo = `PC-${dateStr}-${String(nextSeq).padStart(4, '0')}`;

    // Create the petty cash record
    const pettyCash = await prisma.pettyCash.create({
      data: {
        voucherNo,
        type,
        cashierId: cashierId || null,
        cashierName,
        amount: Number(amount),
        category: category || null,
        description: description || null,
        refNo: refNo || null,
        bankAccountId: bankAccountId || null,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        createdBy: createdBy || null,
        status: 'Pending',
      },
    });

    // For FUND_ALLOCATION, debit the source bank account balance
    if (type === 'FUND_ALLOCATION' && bankAccountId) {
      try {
        await prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            balance: { decrement: Number(amount) },
          },
        });
      } catch (bankErr: any) {
        console.error('Failed to update bank balance for petty cash allocation:', bankErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: pettyCash,
    });
  } catch (error: any) {
    console.error('Error creating petty cash record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
