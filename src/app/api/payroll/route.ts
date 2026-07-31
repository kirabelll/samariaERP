import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const period = searchParams.get('period') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { payrollNo: { contains: search, mode: 'insensitive' } },
        { employeeName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (period) {
      whereClause.period = period;
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.payroll.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payroll.count({ where: whereClause }),
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
    console.error('Error fetching payroll:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payrollNo, period, employeeId, employeeName, baseSalary, allowances, deductions, netSalary, status } = body;

    if (!payrollNo || !period || !employeeId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const existingPayroll = await prisma.payroll.findUnique({
      where: { payrollNo },
    });

    if (existingPayroll) {
      return NextResponse.json(
        { success: false, error: 'Payroll number already exists' },
        { status: 400 }
      );
    }

    const calculatedNetSalary = netSalary || (baseSalary || 0) + (allowances || 0) - (deductions || 0);

    const payroll = await prisma.payroll.create({
      data: {
        payrollNo,
        period,
        employeeId,
        employeeName: employeeName || '',
        baseSalary: baseSalary || 0,
        allowances: allowances || 0,
        deductions: deductions || 0,
        netSalary: calculatedNetSalary,
        status: status || 'Draft',
      },
    });

    return NextResponse.json(
      { success: true, data: payroll },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating payroll:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
