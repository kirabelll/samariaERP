import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Single-date mode: return one record for the daily-cash management page
    if (date) {
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);

      const record = await prisma.dailyCash.findFirst({
        where: {
          cashDate: {
            gte: dateObj,
            lt: nextDay,
          },
        },
      });

      // Fetch recent vouchers as transactions for this date
      let transactions: any[] = [];
      try {
        const vouchers = await prisma.paymentVoucher.findMany({
          where: {
            createdAt: {
              gte: dateObj,
              lt: nextDay,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        transactions = vouchers.map((v) => ({
          id: v.id,
          type: v.voucherType === 'RECEIPT' ? 'receipt' : 'payment',
          description: v.description || `Voucher ${v.voucherNo}`,
          amount: v.amount || 0,
          reference: v.voucherNo,
          time: new Date(v.createdAt).toLocaleTimeString(),
        }));
      } catch {
        // PaymentVoucher model might not have all fields — gracefully degrade
        transactions = [];
      }

      if (record) {
        return NextResponse.json({
          success: true,
          data: {
            date: date,
            openingBalance: record.openingBalance || 0,
            totalReceipts: record.totalReceipts || 0,
            totalPayments: record.totalPayments || 0,
            closingBalance: record.closingBalance || 0,
            physicalCount: record.physicalCount || 0,
            transactions,
            status: (record.status || 'open').toLowerCase(),
          },
        });
      } else {
        // No record yet for this date — return defaults
        return NextResponse.json({
          success: true,
          data: {
            date: date,
            openingBalance: 0,
            totalReceipts: 0,
            totalPayments: 0,
            closingBalance: 0,
            physicalCount: 0,
            transactions,
            status: 'open',
          },
        });
      }
    }

    // List mode: paginated list for date ranges
    const skip = (page - 1) * limit;
    const whereClause: any = {};
    if (from && to) {
      whereClause.cashDate = { gte: new Date(from), lte: new Date(to) };
    } else if (from) {
      whereClause.cashDate = { gte: new Date(from) };
    } else if (to) {
      whereClause.cashDate = { lte: new Date(to) };
    }

    const [data, total] = await Promise.all([
      prisma.dailyCash.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { cashDate: 'desc' },
      }),
      prisma.dailyCash.count({ where: whereClause }),
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
    console.error('Error fetching daily cash records:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, action, physicalCount } = body;

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: date' },
        { status: 400 }
      );
    }

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    // Find or create the record
    let record = await prisma.dailyCash.findFirst({
      where: {
        cashDate: {
          gte: dateObj,
          lt: new Date(dateObj.getTime() + 86400000),
        },
      },
    });

    if (!record) {
      record = await prisma.dailyCash.create({
        data: { cashDate: dateObj, status: 'Open' },
      });
    }

    const updateData: any = {};

    if (action === 'close') {
      updateData.status = 'Closed';
    } else if (action === 'open') {
      updateData.status = 'Open';
    }

    if (physicalCount !== undefined) {
      updateData.physicalCount = physicalCount;
      updateData.difference = physicalCount - (record.closingBalance || 0);
    }

    const updated = await prisma.dailyCash.update({
      where: { id: record.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating daily cash:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cashDate, openingBalance, totalReceipts, totalPayments, closingBalance, physicalCount, difference, status, closedBy, verifiedBy, notes } = body;

    if (!cashDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: cashDate' },
        { status: 400 }
      );
    }

    const cashDateObj = new Date(cashDate);
    cashDateObj.setHours(0, 0, 0, 0);

    const existingRecord = await prisma.dailyCash.findFirst({
      where: {
        cashDate: {
          gte: cashDateObj,
          lt: new Date(cashDateObj.getTime() + 86400000),
        },
      },
    });

    if (existingRecord) {
      const updatedRecord = await prisma.dailyCash.update({
        where: { id: existingRecord.id },
        data: {
          openingBalance: openingBalance ?? existingRecord.openingBalance,
          totalReceipts: totalReceipts ?? existingRecord.totalReceipts,
          totalPayments: totalPayments ?? existingRecord.totalPayments,
          closingBalance: closingBalance ?? existingRecord.closingBalance,
          physicalCount: physicalCount ?? existingRecord.physicalCount,
          difference: difference ?? existingRecord.difference,
          status: status || existingRecord.status,
          closedBy: closedBy ?? existingRecord.closedBy,
          verifiedBy: verifiedBy ?? existingRecord.verifiedBy,
          notes: notes ?? existingRecord.notes,
        },
      });
      return NextResponse.json({ success: true, data: updatedRecord });
    } else {
      const newRecord = await prisma.dailyCash.create({
        data: {
          cashDate: cashDateObj,
          openingBalance: openingBalance || 0,
          totalReceipts: totalReceipts || 0,
          totalPayments: totalPayments || 0,
          closingBalance: closingBalance || 0,
          physicalCount,
          difference,
          status: status || 'Open',
          closedBy,
          verifiedBy,
          notes,
        },
      });
      return NextResponse.json({ success: true, data: newRecord }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error creating/updating daily cash record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
