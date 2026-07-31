import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const includeTransactions = searchParams.get('includeTransactions') === 'true';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { bankName: { contains: search, mode: 'insensitive' } },
        { accountNo: { contains: search, mode: 'insensitive' } },
        { accountName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.bankAccount.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: includeTransactions
          ? { transactions: { orderBy: { transDate: 'desc' }, take: 20 } }
          : false,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bankAccount.count({ where: whereClause }),
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
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankName, accountNo, accountName, branch, currency, balance, status } = body;

    if (!bankName || !accountNo || !accountName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: bankName, accountNo, accountName' },
        { status: 400 }
      );
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        bankName,
        accountNo,
        accountName,
        branch: branch || null,
        currency: currency || 'ETB',
        balance: balance || 0,
        status: status || 'Active',
      },
    });

    return NextResponse.json(
      { success: true, data: bankAccount },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating bank account:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
