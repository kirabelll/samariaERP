import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.voucherNo = { contains: search, mode: 'insensitive' };
    }
    if (startDate || endDate) {
      whereClause.entryDate = {};
      if (startDate) {
        whereClause.entryDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.entryDate.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { account: true },
        orderBy: { entryDate: 'desc' },
      }),
      prisma.journalEntry.count({ where: whereClause }),
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
    console.error('Error fetching journal entries:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entries, refModule, refId, postedBy } = body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'entries must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate entries have accountId, debit, credit
    const validEntries = entries.every(
      (e: any) => e.accountId && (e.debit || e.credit)
    );

    if (!validEntries) {
      return NextResponse.json(
        { success: false, error: 'Each entry must have accountId, debit, or credit' },
        { status: 400 }
      );
    }

    // Generate voucher number
    const count = await prisma.journalEntry.count();
    const voucherNo = `JE-${String(count + 1).padStart(7, '0')}`;

    // Create batch entries
    const createdEntries = await Promise.all(
      entries.map((entry: any) =>
        prisma.journalEntry.create({
          data: {
            voucherNo,
            accountId: entry.accountId,
            debit: entry.debit || 0,
            credit: entry.credit || 0,
            description: entry.description || null,
            refModule: refModule || null,
            refId: refId || null,
            postedBy: postedBy || null,
          },
          include: { account: true },
        })
      )
    );

    notify({ module: 'FINANCE', event: 'journal_posted', details: { voucherNo: voucherNo, description: createdEntries[0]?.description || 'Journal entry posted' } });

    return NextResponse.json(
      { success: true, data: { voucherNo, entries: createdEntries } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating journal entries:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
