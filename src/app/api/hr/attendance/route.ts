import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const employeeId = searchParams.get('employeeId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (employeeId) {
      whereClause.employeeId = employeeId;
    }
    if (status) {
      whereClause.status = status;
    }
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { employee: true },
        orderBy: { date: 'desc' },
      }),
      prisma.attendance.count({ where: whereClause }),
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
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeId, date, checkIn, checkOut, status, notes } = body;

    if (!employeeId || !date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employeeId, date' },
        { status: 400 }
      );
    }

    // Check if attendance already exists for this date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: attendanceDate,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Attendance already recorded for this date' },
        { status: 400 }
      );
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: attendanceDate,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status || 'Present',
        notes: notes || null,
      },
      include: { employee: true },
    });

    return NextResponse.json(
      { success: true, data: attendance },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating attendance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
