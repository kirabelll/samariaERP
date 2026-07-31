import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const module = searchParams.get('module') || '';
    const status = searchParams.get('status') || '';
    const severity = searchParams.get('severity') || '';
    const exceptionType = searchParams.get('exceptionType') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (module) {
      whereClause.module = module;
    }
    if (status) {
      whereClause.status = status;
    }
    if (severity) {
      whereClause.severity = severity;
    }
    if (exceptionType) {
      whereClause.exceptionType = exceptionType;
    }

    const [data, total] = await Promise.all([
      prisma.exceptionLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.exceptionLog.count({ where: whereClause }),
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
    console.error('Error fetching exception logs:', error);
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
      exceptionType,
      severity,
      module,
      recordId,
      recordRef,
      description,
      assignedTo,
    } = body;

    // Validate required fields
    if (!exceptionType || !module || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const exceptionLog = await prisma.exceptionLog.create({
      data: {
        exceptionType,
        severity: severity || 'Medium',
        module,
        recordId,
        recordRef,
        description,
        assignedTo,
        status: 'Open',
      },
    });

    return NextResponse.json({
      success: true,
      data: exceptionLog,
    });
  } catch (error: any) {
    console.error('Error creating exception log:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
