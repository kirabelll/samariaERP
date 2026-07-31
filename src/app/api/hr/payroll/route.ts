import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';
import { requestApproval } from '@/lib/approval-workflow';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || '0');

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.periodName = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      whereClause.status = status;
    }
    if (year) {
      // This would require a more complex query if we need to filter by parsed year/month
      // For now, we keep periodName filtering
    }

    const [data, total] = await Promise.all([
      prisma.payrollPeriod.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { items: { include: { employee: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payrollPeriod.count({ where: whereClause }),
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
    console.error('Error fetching payroll periods:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, year, status } = body;

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: month, year' },
        { status: 400 }
      );
    }

    const periodName = `${year}-${String(month).padStart(2, '0')}`;

    const existing = await prisma.payrollPeriod.findUnique({
      where: { periodName },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll period already exists' },
        { status: 400 }
      );
    }

    const payrollPeriod = await prisma.payrollPeriod.create({
      data: {
        periodName,
        month,
        year,
        status: status || 'Draft',
      },
    });

    notify({ module: 'HR', event: 'payroll_processed', details: { periodName: payrollPeriod.periodName } });

    // Auto-submit for approval
    try {
      await requestApproval({
        module: 'PayrollPeriod',
        recordId: payrollPeriod.id,
        recordRef: payrollPeriod.periodName,
        amount: 0,
        description: `Payroll Period ${payrollPeriod.periodName} — Ready for approval`,
        requesterId: body.createdBy || '',
      });
    } catch (e) {
      console.error('Approval request failed for payroll:', e);
    }

    return NextResponse.json(
      { success: true, data: payrollPeriod },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating payroll period:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
