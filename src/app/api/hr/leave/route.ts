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
    const employeeId = searchParams.get('employeeId') || '';
    const status = searchParams.get('status') || '';
    const leaveType = searchParams.get('leaveType') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (employeeId) {
      whereClause.employeeId = employeeId;
    }
    if (status) {
      whereClause.status = status;
    }
    if (leaveType) {
      whereClause.leaveType = leaveType;
    }

    const [data, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.leaveRequest.count({ where: whereClause }),
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
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, leaveType, startDate, endDate, days, reason, approvedBy } = body;

    if (!employeeId || !leaveType || !startDate || !endDate || !days) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employeeId, leaveType, startDate, endDate, days' },
        { status: 400 }
      );
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days: parseFloat(days),
        reason: reason || null,
        status: 'Pending',
        approvedBy: approvedBy || null,
      },
      include: { employee: true },
    });

    notify({ module: 'HR', event: 'leave_requested', details: { leaveType: leaveRequest.leaveType, days: leaveRequest.days, startDate: leaveRequest.startDate.toISOString() } });

    // Auto-submit for approval
    try {
      const empName = leaveRequest.employee
        ? `${leaveRequest.employee.firstName || ''} ${leaveRequest.employee.lastName || ''}`.trim()
        : 'Unknown';
      await requestApproval({
        module: 'LeaveRequest',
        recordId: leaveRequest.id,
        recordRef: `LR-${leaveRequest.id.slice(0, 8)}`,
        amount: 0,
        description: `Leave Request — ${leaveRequest.leaveType} for ${leaveRequest.days} days by ${empName}`,
        requesterId: approvedBy || '',
      });
    } catch (e) {
      console.error('Approval request failed for leave:', e);
    }

    return NextResponse.json(
      { success: true, data: leaveRequest },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
