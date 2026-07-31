import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requestApproval } from '@/lib/approval-workflow';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const employeeId = searchParams.get('employeeId') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (employeeId) {
      whereClause.employeeId = employeeId;
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.employeeAdvance.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { employee: true },
        orderBy: { issueDate: 'desc' },
      }),
      prisma.employeeAdvance.count({ where: whereClause }),
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
    console.error('Error fetching advances:', error);
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
      employeeId,
      amount,
      reason,
      monthlyDeduction,
      approvedBy,
    } = body;

    if (!employeeId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employeeId, amount' },
        { status: 400 }
      );
    }

    const advance = await prisma.employeeAdvance.create({
      data: {
        employeeId,
        amount,
        remainingBal: amount,
        monthlyDeduction: monthlyDeduction || 0,
        reason: reason || null,
        status: 'Pending',
        approvedBy: approvedBy || null,
      },
      include: { employee: true },
    });

    // Auto-submit for approval
    try {
      const empName = advance.employee
        ? `${advance.employee.firstName || ''} ${advance.employee.lastName || ''}`.trim()
        : 'Unknown';
      await requestApproval({
        module: 'EmployeeAdvance',
        recordId: advance.id,
        recordRef: `ADV-${advance.id.slice(0, 8)}`,
        amount: Number(amount) || 0,
        description: `Employee Advance — ${Number(amount).toLocaleString('en-US')} ETB for ${empName}${reason ? ': ' + reason : ''}`,
        requesterId: approvedBy || '',
      });
    } catch (e) {
      console.error('Approval request failed for advance:', e);
    }

    return NextResponse.json(
      { success: true, data: advance },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating advance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
